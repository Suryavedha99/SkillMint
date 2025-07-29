# backend/routers/lessons.py

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.supabase_service import supabase
from backend.models.custom_course import LessonInput, LessonOutput

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("/", response_model=List[LessonOutput])
def list_lessons(course_id: Optional[int] = None):
    """
    List all lessons, or filter by course_id if provided.
    """
    try:
        query = supabase.table("custom_lessons").select("*")
        if course_id is not None:
            query = query.eq("course_id", course_id)
        res = query.order("created_at", desc=False).execute()
        return [LessonOutput(**row) for row in res.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing lessons: {e}")


@router.get("/{lesson_id}", response_model=LessonOutput)
def get_lesson(lesson_id: int):
    """
    Retrieve a single lesson by its ID.
    """
    try:
        res = (
            supabase
            .table("custom_lessons")
            .select("*")
            .eq("id", lesson_id)
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Lesson not found")
        return LessonOutput(**res.data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching lesson: {e}")


class LessonCreate(BaseModel):
    course_id: int
    title: str
    content: str


@router.post("/", response_model=LessonOutput)
def create_lesson(payload: LessonCreate):
    """
    Create a new lesson under a given course.
    """
    try:
        res = supabase.table("custom_lessons").insert(payload.dict()).execute()
        created = res.data[0]
        return LessonOutput(**created)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating lesson: {e}")


@router.put("/{lesson_id}", response_model=LessonOutput)
def update_lesson(lesson_id: int, payload: LessonInput):
    """
    Update title/content of an existing lesson.
    """
    try:
        res = (
            supabase
            .table("custom_lessons")
            .update(payload.dict())
            .eq("id", lesson_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Lesson not found")
        return LessonOutput(**res.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating lesson: {e}")


@router.delete("/{lesson_id}", response_model=dict)
def delete_lesson(lesson_id: int):
    """
    Delete a lesson by ID.
    """
    try:
        res = (
            supabase
            .table("custom_lessons")
            .delete()
            .eq("id", lesson_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Lesson not found")
        return {"message": "Lesson deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting lesson: {e}")

from backend.models.custom_course import LessonOutput

async def get_lessons_by_course_id(course_id: str) -> list:
    """
    Fetch all lessons for a given course_id.
    """
    try:
        res = supabase.table("custom_lessons").select("*").eq("course_id", course_id).order("created_at", desc=False).execute()
        return [LessonOutput(**row) for row in res.data]
    except Exception as e:
        logging.error(f"Error fetching lessons for course_id={course_id}: {e}")
        return []