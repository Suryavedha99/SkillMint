import logging
import uuid
from backend.services.supabase_service import supabase, serialize
from backend.services.llm_service import (
    generate_content as generate_course_outline,
    generate_lesson_quiz as generate_lesson_content,
    generate_lesson_quiz as generate_quiz,
)
from backend.services.youtube_service import fetch_videos
from backend.models.schemas import BuildCourseRequest

logger = logging.getLogger("uvicorn.error")

async def build_and_save_course(request: BuildCourseRequest) -> dict:
    logger.info(f"🛠️ Building course for prompt: {request.prompt}")

    # 1. Generate course outline
    outline = await generate_course_outline(request.prompt)

    lessons = []
    for module in outline["modules"]:
        for lesson_title in module["lessons"]:
            content = await generate_lesson_content(lesson_title)
            quiz = await generate_quiz(lesson_title)
            videos = await fetch_videos(lesson_title)
            lessons.append({
                "id": str(uuid.uuid4()),
                "title": lesson_title,
                "content": content,
                "quiz_questions": quiz,
                "videos": videos
            })

    # 2.Compose payload
    payload = {
        "user_id": request.user_id,
        "title": outline["title"],
        "description": outline.get("description", ""),
        "lessons": lessons,
    }

    # 3. Save to Supabase
    resp = supabase.table("courses").insert(serialize(payload)).execute()
    if not resp.data:
        raise Exception("❌ Failed to insert course into Supabase")

    logger.info(f"✅ Course built and saved: {payload['title']}")
    return resp.data[0]
