# backend/services/supabase_service.py
import os
from supabase import create_client
from uuid import uuid4
from backend.models.schemas import CourseOut
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the .env file")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

import logging
from typing import List, Dict, Any
from backend.models.schemas import CourseCreate
from typing import Optional

logger = logging.getLogger("uvicorn.error")

MAX_QUESTIONS = 5

# --- Utility to convert Pydantic objects to dict (recursive) ---
def serialize(obj):
    if isinstance(obj, list):
        return [serialize(item) for item in obj]
    elif hasattr(obj, "dict"):
        return obj.dict()
    return obj

def add_lesson_title_to_quizzes(quizzes, lessons):
    lesson_id_to_title = {lesson["id"]: lesson["title"] for lesson in lessons}
    for quiz in quizzes:
        quiz["lesson_title"] = lesson_id_to_title.get(quiz["lesson_id"], "")
    return quizzes

async def create_course(course: CourseCreate) -> CourseOut:
    try:
        # Step 1: Insert course without lessons first
        course_payload = {
            "user_id": course.user_id,
            "title": course.title,
            "description": course.description,
        }
        course_resp = supabase.table("courses").insert(course_payload).execute()
        course_data = course_resp.data[0]
        course_id = course_data["id"]

        # Step 2: Insert each lesson with foreign key to course_id
        lessons_payload = []
        videos_payload = []
        quizzes_payload = []

        for lesson in course.lessons:
            lesson_data = {
                "course_id": course_id,
                "title": lesson.title,
                "summary": getattr(lesson, "summary", "") or "No summary provided.",  # <-- PATCHED LINE
                "content": lesson.content,
            }
            # Insert lesson first to get lesson_id
            inserted_lesson = supabase.table("lessons").insert(lesson_data).execute().data[0]
            lesson_id = inserted_lesson["id"]

            # Videos
            if lesson.videos:
                for video in lesson.videos:
                    # Use attribute access, not .get()
                    videos_payload.append({
                        "id": str(uuid4()), 
                        "course_id": course_id,
                        "lesson_id": lesson_id,
                        "title": getattr(video, "title", None),
                        "video_id": getattr(video, "video_id", None),
                        "description": getattr(video, "description", None),
                        "thumbnail": getattr(video, "thumbnail", None),
                        "url": getattr(video, "url", None),
                    })

            # Quizzes
            if lesson.quiz:
                quizzes_payload.append({
                    "course_id": course_id,
                    "lesson_id": lesson_id,
                    "title": f"Quiz for {lesson.title}",
                    "questions": [q if isinstance(q, dict) else q.model_dump() for q in lesson.quiz],
                })

        # Bulk insert videos and quizzes
        if videos_payload:
            supabase.table("videos").insert(videos_payload).execute()
        if quizzes_payload:
            supabase.table("quizzes").insert(quizzes_payload).execute()

        # Fetch all lessons, videos, quizzes for return
        lessons_with_ids = supabase.table("lessons").select("*").eq("course_id", course_id).execute().data
        videos = supabase.table("videos").select("*").eq("course_id", course_id).execute().data
        quizzes = supabase.table("quizzes").select("*").eq("course_id", course_id).execute().data

        # --- PATCH: Add lesson_title to each quiz ---
        lesson_id_to_title = {lesson["id"]: lesson["title"] for lesson in lessons_with_ids}
        for quiz in quizzes:
            quiz["lesson_title"] = lesson_id_to_title.get(quiz["lesson_id"], "")

        return CourseOut(
            id=course_id,
            user_id=course.user_id,
            title=course.title,
            description=course.description,
            lessons=lessons_with_ids,
            videos=videos,
            quizzes=quizzes
        )
    except Exception as e:
        logger.error(f"[supabase] Create failed: {e}")
        raise RuntimeError("Failed to create course")

async def get_course(course_id: str) -> Dict[str, Any]:
    try:
        resp = supabase.table("courses").select("*").eq("id", course_id).single().execute()
        if not resp.data:
            raise ValueError("Course not found")
        return resp.data
    except Exception as e:
        logger.error(f"[supabase] Get failed: {e}")
        raise RuntimeError("Failed to fetch course")


def list_courses(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    try:
        query = supabase.table("courses").select("*").order("created_at", desc=True)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        return result.data

    except Exception as e:
        logger.error(f"[supabase] List failed: {e}")
        raise RuntimeError("Failed to fetch courses")


async def update_course(course_id: str, course: CourseCreate) -> Dict[str, Any]:
    try:
        payload = {
        "title": course.title,
        "description": course.description,
        "lessons": serialize(course.lessons),
    }

        resp = supabase.table("courses").update(payload).eq("id", course_id).execute()
        logger.info(f"[supabase] Course updated: {course_id}")
        return resp.data[0] if resp.data else {}
    except Exception as e:
        logger.error(f"[supabase] Update failed: {e}")
        raise RuntimeError("Failed to update course")


async def delete_course(course_id: str) -> None:
    try:
        # Delete quizzes
        supabase.table("quizzes").delete().eq("course_id", course_id).execute()
        # Delete videos
        supabase.table("videos").delete().eq("course_id", course_id).execute()
        # Delete lessons
        supabase.table("lessons").delete().eq("course_id", course_id).execute()
        # Finally, delete the course itself
        supabase.table("courses").delete().eq("id", course_id).execute()
        logger.info(f"[supabase] Course and related data deleted: {course_id}")
    except Exception as e:
        logger.error(f"[supabase] Delete failed: {e}")
        raise RuntimeError("Failed to delete course and related data")

async def get_course_by_id(course_id: str) -> Optional[dict]:
    course = supabase.from_("courses").select("*").eq("id", course_id).single().execute().data
    if not course:
        return None
    lessons = await get_lessons_by_course_id(course_id)
    quizzes = await get_quizzes_by_course_id(course_id)
    quizzes = add_lesson_title_to_quizzes(quizzes, lessons)
    videos = await get_videos_by_course_id(course_id)  # <-- Fetch videos here
    course["lessons"] = lessons
    course["quizzes"] = quizzes
    course["videos"] = videos  # <-- Add videos to the course dict
    return course

async def get_quizzes_by_course_id(course_id: str):
    lessons = await get_lessons_by_course_id(course_id)
    res = supabase.table("quizzes").select("*").eq("course_id", course_id).execute()
    quizzes = res.data or []
    return add_lesson_title_to_quizzes(quizzes, lessons)

async def list_courses(user_id: str) -> List[Dict[str, Any]]:
    try:
        resp = supabase.table("courses").select("*").eq("user_id", user_id).execute()
        return resp.data
    except Exception as e:
        logger.error(f"[supabase] List failed: {e}")
        raise RuntimeError("Failed to fetch courses")
    

async def get_quiz_by_lesson_id(course_id: str, lesson_id: str) -> Optional[dict]:
    try:
        resp = supabase.table("quizzes") \
            .select("*") \
            .eq("course_id", course_id) \
            .eq("lesson_id", lesson_id) \
            .single() \
            .execute()

        if resp.data:
            return resp.data
        return None
    except Exception as e:
        logger.error(f"[supabase] Failed to fetch quiz by lesson_id: {e}")
        return None

# near the bottom, alongside your other async functions

async def get_lessons_by_course_id(course_id: str) -> List[dict]:
    resp = supabase.table("lessons") \
        .select("*") \
        .eq("course_id", course_id) \
        .order("created_at", desc=False) \
        .execute()

    if not resp.data:
        logger.error(f"[supabase] Failed to fetch lessons for {course_id}: {getattr(resp, 'error', 'No error info')}")
        return []

    return resp.data  # each item matches your Lesson schema

async def get_videos_by_course_id(course_id: str):
    res = supabase.table("videos").select("*").eq("course_id", course_id).execute()
    return res.data or []