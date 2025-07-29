# backend/routers/custom_courses.py
from fastapi import APIRouter, HTTPException
from supabase import Client
from backend.models.custom_course import CustomCourseInput, CustomCourseOutput, LessonOutput, VideoOutput
from backend.services.supabase_service import supabase
import logging

router = APIRouter(prefix="/courses/custom", tags=["Custom Courses"])
logger = logging.getLogger("uvicorn.error")

# --- Build-Course Endpoint ---
from pydantic import BaseModel

class BuildCourseIn(BaseModel):
    prompt: str
    user_id: str

class BuildCourseOut(BaseModel):
    course_id: str

@router.post("/build-course", response_model=BuildCourseOut)
def build_course(data: BuildCourseIn):
    """
    Generate full course via AI and save to Supabase.
    """
    try:
        # Call AI service to generate course payload
        # e.g. generated = ai_client.build_course(data.prompt)
        generated = {
            "title": "AI Course",
            "description": "Generated description",
            "lessons": [{"title": "Intro", "content": "..."}],
            "videos": [{"title": "Video1", "url": "https://..."}]
        }
        # Insert into custom_courses
        course_resp = supabase.table("custom_courses").insert({
            "user_id": data.user_id,
            "title": generated["title"],
            "description": generated["description"]
        }).execute()
        course_id = course_resp.data[0]["id"]

        # Persist generated lessons
        lessons_data = [
            {"course_id": course_id, "title": l["title"], "content": l["content"]}
            for l in generated["lessons"]
        ]
        if lessons_data:
            supabase.table("custom_lessons").insert(lessons_data).execute()

        # Persist generated videos
        videos_data = [
            {"course_id": course_id, "title": v["title"], "url": v["url"]}
            for v in generated["videos"]
        ]
        if videos_data:
            supabase.table("custom_videos").insert(videos_data).execute()

        return {"course_id": course_id}
    except Exception as e:
        logger.error(f"Failed to build custom course: {e}")
        raise HTTPException(status_code=500, detail="Error building custom course")("uvicorn.error")

@router.post("/", response_model=dict)
def create_custom_course(course: CustomCourseInput):
    try:
        # Insert course
        course_data = {
            "user_id": course.user_id,
            "title": course.title,
            "description": course.description
        }
        course_resp = supabase.table("custom_courses").insert(course_data).execute()
        course_id = course_resp.data[0]["id"]

        # Insert lessons
        lessons_data = [
            {
                "course_id": course_id,
                "title": lesson.title,
                "content": lesson.content,
                "summary": getattr(lesson, "summary", "") or "No summary provided."  # <-- Add this line
            }
            for lesson in course.lessons
        ]
        if lessons_data:
            supabase.table("custom_lessons").insert(lessons_data).execute()

        # Insert videos
        videos_data = [
            {"course_id": course_id, "title": video.title, "url": video.url}
            for video in course.videos
        ]
        if videos_data:
            supabase.table("custom_videos").insert(videos_data).execute()

        return { "message": "Course saved successfully", "course_id": course_id }

    except Exception as e:
        logger.error(f"Failed to save custom course: {e}")
        raise HTTPException(status_code=500, detail="Error saving custom course")

@router.get("/", response_model=list)
def get_all_custom_courses(user_id: str):
    try:
        result = supabase.table("custom_courses").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to get courses: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving courses")

@router.get("/{course_id}", response_model=dict)
def get_custom_course(course_id: int):
    try:
        # Get course
        course = supabase.table("custom_courses").select("*").eq("id", course_id).single().execute().data
        # Get lessons
        lessons = supabase.table("custom_lessons").select("*").eq("course_id", course_id).execute().data
        # Get videos
        videos = supabase.table("custom_videos").select("*").eq("course_id", course_id).execute().data

        return CustomCourseOutput(
            id=course["id"],
            user_id=course["user_id"],
             title=course["title"],
             description=course.get("description"),
             lessons=[LessonOutput(**l) for l in lessons],
             videos=[VideoOutput(**v)   for v in videos],
        )

    except Exception as e:
        logger.error(f"Failed to fetch custom course {course_id}: {e}")
        raise HTTPException(status_code=500, detail="Error fetching custom course")
