# backend/routers/courses.py

from fastapi import APIRouter
from typing import List
from backend.models.schemas import CourseCreate, CourseOut
from backend.services.supabase_service import get_quiz_by_lesson_id
from backend.services.supabase_service import (
    create_course,
    get_course,
    list_courses,
    update_course,
    delete_course,
    get_course_by_id,
)
import logging
from backend.services.supabase_service import (
    get_course,
    list_courses,
    get_lessons_by_course_id,
    get_videos_by_course_id,      # <-- add this
    get_quizzes_by_course_id      # <-- add this
)
from fastapi import HTTPException
from backend.services.build_course_service import build_and_save_course
from backend.models.schemas import BuildCourseRequest 
from fastapi import APIRouter, HTTPException
from backend.services.supabase_service import get_course, get_lessons_by_course_id
from backend.models.schemas import CourseOut

router = APIRouter(prefix="/courses", tags=["Courses"])
logger = logging.getLogger("uvicorn.error")

@router.post("/", response_model=CourseOut)
async def create_new(course: CourseCreate):
    logger.info(f"[courses] Creating course: {course.title}")
    return await create_course(course)

@router.get("/", response_model=List[CourseOut])
async def read_all(user_id: str = None):
    logger.info("[courses] Fetching all courses")
    if user_id:
        logger.info(f"[courses] Filtering for user_id={user_id}")
        courses = await list_courses(user_id=user_id)
    else:
        courses = await list_courses()

    result = []
    for course in courses:
        lessons = await get_lessons_by_course_id(course["id"])
        videos = await get_videos_by_course_id(course["id"])
        quizzes = await get_quizzes_by_course_id(course["id"])
        result.append({
            **course,
            "lessons": lessons,
            "videos": videos,
            "quizzes": quizzes,
        })
    return result

@router.put("/{course_id}", response_model=CourseOut)
async def update(course_id: str, course: CourseCreate):
    logger.info(f"[courses] Updating course ID: {course_id}")
    return await update_course(course_id, course)

@router.delete("/{course_id}")
async def remove(course_id: str):
    logger.info(f"[courses] Deleting course ID: {course_id}")
    await delete_course(course_id)
    return {"status": "deleted"}

@router.post("/courses/build", response_model=CourseOut, tags=["Courses"])
async def build_course(request: BuildCourseRequest):
    try:
        course = await build_and_save_course(request)
        return course
    except Exception as e:
        logger.error(f"[router] build_course failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to build course")

@router.get("/{course_id}/lessons/{lesson_id}/quiz")
async def get_lesson_quiz(course_id: str, lesson_id: str):
    logger.info(f"[courses] Fetching quiz for lesson {lesson_id} in course {course_id}")
    quiz = await get_quiz_by_lesson_id(course_id, lesson_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.get("/{course_id}", response_model=CourseOut)
async def read_course(course_id: str):
    try:
        course = await get_course(course_id)
    except Exception:
        raise HTTPException(404, "Course not found")

    lessons = await get_lessons_by_course_id(course_id)
    videos = await get_videos_by_course_id(course_id)
    quizzes = await get_quizzes_by_course_id(course_id)

    return CourseOut(
        id=course["id"],
        user_id=course["user_id"],
        title=course["title"],
        description=course["description"],
        lessons=lessons,
        videos=videos,
        quizzes=quizzes,
    )