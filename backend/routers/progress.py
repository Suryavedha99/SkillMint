from fastapi import APIRouter, HTTPException, Query
from backend.services.supabase_service import supabase
from backend.models.schemas import LessonProgressIn
from backend.services.supabase_service import supabase

router = APIRouter(tags=["Progress"])

@router.post("/progress/lesson")
def record_lesson_progress(data: LessonProgressIn):
    existing = supabase.from_("progress").select("*").match({
        "user_id": data.user_id,
        "course_id": data.course_id,
        "lesson_id": data.lesson_id
    }).execute().data

    if existing:
        return {"status": "already recorded"}

    supabase.from_("progress").insert({
        "user_id": data.user_id,
        "course_id": data.course_id,
        "lesson_id": data.lesson_id
    }).execute()

    return {"status": "success"}

@router.get("/progress")
def get_user_progress(user_id: str):
    result = supabase.from_("progress").select("*").eq("user_id", user_id).execute()
    return result.data

from backend.routers.lessons import get_lessons_by_course_id

@router.get("/progress/course/{course_id}")
async def get_course_progress(course_id: str, user_id: str = Query(...)):
    """
    Returns:
      - total_lessons: int
      - completed_lessons: int
    """
    # 1) Fetch all lessons for this course
    lessons = await get_lessons_by_course_id(course_id)
    total = len(lessons)

    # 2) Fetch all progress rows for this user & course
    prog = supabase.from_("progress") \
        .select("lesson_id") \
        .eq("user_id", user_id) \
        .eq("course_id", course_id) \
        .execute()

    completed = sum(1 for row in prog.data if row["lesson_id"] is not None)

    return {
        "total_lessons": total,
        "completed_lessons": completed,
    }