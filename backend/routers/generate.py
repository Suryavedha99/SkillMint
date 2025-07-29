# backend/routers/generate.py

import os
import re
import json
from typing import List
from uuid import uuid4
from fastapi.responses import JSONResponse
import logging
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi import Request
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel
import httpx
from backend.models.schemas import Quiz 
from backend.services.supabase_service import create_course
from backend.models.schemas import VideoItem
from backend.models.schemas import (
    GenerateResponse,
    CourseCreate,
    Lesson,
    MCQ,
    YoutubeResponse
)
from backend.services.llm_service import generate_content, stream_generate_content
from backend.services.youtube_service import fetch_videos
from backend.utils.quiz_parser import robust_parse_mcqs

# Ensure LLM settings are loaded
LLM_URL = os.getenv("LLM_URL")
LLM_MODEL = os.getenv("LLM_MODEL")
if not LLM_URL or not LLM_MODEL:
    raise RuntimeError("LLM_URL and LLM_MODEL must be set in environment variables")

router = APIRouter(prefix="/generate", tags=["Generate"])
logger = logging.getLogger("uvicorn.error")


# --- Helpers ---

# Quiz generation prompt template (used for both lesson quizzes and unit exams)
QUIZ_PROMPT_TEMPLATE = r"""
You are an expert AI quiz generator.

Your task is to generate **5 high-quality multiple choice questions (MCQs)** from the lesson content below.

Each question must:
- Test understanding of key concepts from the lesson.
- Avoid superficial or overly simplistic questions.
- Include plausible distractors (wrong options).
- Vary in difficulty, with at least one being a conceptual or application-based question.

Return the result as a **valid JSON array**, where each question is an object with the following fields:
- "question": the question text
- "options": an array of 4 options (strings)
- "answer": the correct option (must exactly match one of the options)

Example:
[
  {{
    "question": "What is the main purpose of using functions in Python?",
    "options": ["To store data", "To reduce code repetition", "To handle exceptions", "To create classes"],
    "answer": "To reduce code repetition"
  }},
  {{
    "question": "Which of the following is a correct syntax for a while loop in Python?",
    "options": ["while x > 0", "while (x > 0):", "while x > 0:", "x > 0 while:"],
    "answer": "while x > 0:"
  }}
]

IMPORTANT RULES:
- Only output valid **JSON** — no markdown, no comments, no code blocks.
- Do NOT include trailing commas.
- Do NOT include any text before or after the JSON array.
- Do NOT wrap the output in ```json or any other formatting.
- This is because your response will be parsed by a program and must strictly be valid JSON.

To help you understand how your output will be parsed, here is the parser code that will consume your response:

[BEGIN PARSER CODE]

import re
from typing import List, Dict
import json

def parse_mcqs(text: str) -> List[Dict]:
    ""
    Extremely forgiving MCQ parser for LLM output.
    ""
    mcqs = []
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    q_blocks = re.split(r"\n\s*(?=Q\d+[\):])", text)
    for block in q_blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines or not re.match(r"^Q\d+[\):]", lines[0]):
            continue
        q_line = lines[0]
        question = re.sub(r"^Q\d+[\):]\s*", "", q_line)
        if not question:
            if len(lines) > 1 and not re.match(r"^[A-Da-d][\)\.:\-]", lines[1]):
                question = lines[1]
                lines = [lines[0]] + lines[2:]
        options = {{}}
        answer = None
        for line in lines[1:]:
            opt_match = re.match(r"^([A-Da-d])[\)\.:\-]?\s*(.*)$", line)
            if opt_match:
                key = opt_match.group(1).upper()
                val = opt_match.group(2).strip()
                options[key] = val
                continue
            ans_match = re.match(r"^Answer\s*[:\-]?\s*(.*)$", line, re.IGNORECASE)
            if ans_match:
                raw_ans = ans_match.group(1).strip()
                if re.fullmatch(r"[A-Da-d]", raw_ans):
                    answer = raw_ans.upper()
                elif re.match(r"^[A-Da-d][\)\.:\-]?", raw_ans):
                    answer = raw_ans[0].upper()
                else:
                    for k, v in options.items():
                        if raw_ans.lower() in v.lower() or v.lower() in raw_ans.lower():
                            answer = k
                            break
        if not answer and options:
            for k, v in options.items():
                if 'correct' in v.lower() or 'right' in v.lower():
                    answer = k
                    break
        if question and len(options) >= 2 and answer in options:
            all_keys = ['A', 'B', 'C', 'D']
            opts = [options.get(k, "") for k in all_keys]
            mcqs.append({{
                "question": question,
                "options": opts,
                "answer": options[answer]
            }})
    return mcqs

def robust_parse_mcqs(text: str):
    ""
    Extracts and parses the first JSON array from text, even if wrapped in markdown or with trailing commas.
    Returns a list of dicts or [] if parsing fails.
    ""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE)
    json_match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if json_match:
        text = json_match.group(1)
    array_match = re.search(r"\[\s*{{.*?}}\s*\]", text, re.DOTALL)
    if array_match:
        text = array_match.group(0)
    text = re.sub(r",\s*([\]}}])", r"\1", text)
    text = re.sub(r",\s*\]", "]", text)
    try:
        return json.loads(text)
    except Exception:
        return []

[END PARSER CODE]

Lesson Content:
{lesson_content}
"""

def get_outline_prompt(topic: str) -> str:
    return f"""
You are an expert curriculum designer.

Your task is to generate a clear, structured course outline based on the user's topic: **{topic}**.

Think critically and tailor the number of lessons to the scope of the topic. Structure the lessons to teach the topic logically and completely.

🧠 **Guidelines for lesson design**:
- If the topic is **broad** (e.g. "Python Programming"), break it down into essential subtopics (e.g. syntax, control flow, data types, etc.).
- If the topic is **narrow** (e.g. "SQL JOINs"), only include 1–3 in-depth lessons.

📌 **Each lesson must include**:
1. A short, clear, **keyword-based title** formatted as either:
   - `<Subtopic> in <Topic>` (e.g. `Control Flow in Python`)
   - or `<Topic>: <Subtopic>` (e.g. `Python: Control Flow`)
2. A **1-line summary** of what is covered in that lesson.

🚫 Avoid generic/vague titles:
- “Introduction”
- “Overview”
- “Key Concepts”
- “Wrapping Up”

✅ Instead, write specific, relevant titles like:
- “Variables and Data Types in Python”
- “Python: Functions and Modules”
- “Error Handling in Python”

📺 **Why this matters**: These titles are used in YouTube video searches. So vague titles (like "Syntax Basics") may return unrelated results (like C++). You **must include the topic name** (e.g. “Python”) in **every** title.

The output format should strictly follow this structure because your response will be parsed by a parser and any other output will not be accepted.

📝 **Output format**:
Lesson 1. <Title>: <1-line summary of what’s covered>  
Lesson 2. <Title>: <1-line summary of what’s covered>  
... and so on.

🧪 Example:
Lesson 1. Variables and Data Types in Python: Learn about strings, integers, floats, booleans, and type conversion.  
Lesson 2. Control Flow in Python: Master if-statements, loops, and logical operators.

Now generate the best outline for the following topic: **{topic}**

End the response with "---END---"
"""

import re

def parse_outline_to_lessons(outline_raw: str) -> list[dict]:
    lines = [l.strip() for l in outline_raw.splitlines() if l.strip()]
    lessons = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Existing: 1. **Title**
        title_match = re.match(r'^\d+\.\s+\*\*(.+?)\*\*$', line)
        if title_match:
            current_title = title_match.group(1).strip()
            # Look ahead for summary
            if i + 1 < len(lines):
                summary_line = lines[i + 1].strip()
                if summary_line.startswith("-"):
                    summary = summary_line.lstrip("- ").strip()
                    lessons.append({
                        "title": current_title,
                        "summary": summary
                    })
                    i += 2
                    continue
        # Existing: 1. Title: Summary
        elif "." in line:
            parts = line.split(".", 1)
            if parts[0].strip().isdigit():
                title_desc = parts[1].split(":", 1)
                if len(title_desc) == 2:
                    lessons.append({
                        "title": title_desc[0].strip(),
                        "summary": title_desc[1].strip()
                    })
                    i += 1
                    continue
        # NEW: Lesson N. Title [newline] Summary
        lesson_match = re.match(r'^Lesson\s*\d+\.\s*(.+)$', line, re.IGNORECASE)
        if lesson_match:
            title = lesson_match.group(1).strip()
            # Look ahead for summary (next non-empty line)
            summary = ""
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if next_line and not next_line.lower().startswith("lesson"):
                    summary = next_line
                    break
                j += 1
            if title and summary:
                lessons.append({
                    "title": title,
                    "summary": summary
                })
                i = j + 1
                continue
        i += 1
    return lessons

def convert_video_item_to_response(item) -> YoutubeResponse:
    # If it's a dict, extract using .get(); if it's already a VideoItem, access attributes
    if isinstance(item, dict):
        video_id = item.get("id", "")
        title = item.get("title", "")
        desc = item.get("description", "")
        # Keep only first 300 characters and remove newlines
        description = desc.replace("\n", " ").strip()[:300]
        thumbnail = item.get("thumbnails", {}).get("default", {}).get("url", "")
    else:  # assume it's a VideoItem
        video_id = item.video_id
        title = item.title
        description = item.description
        thumbnail = item.thumbnail

    return YoutubeResponse(
        videos=[
            VideoItem(
                video_id=video_id,
                title=title,
                description=description,
                thumbnail=thumbnail
            )
        ]
    )

# --- Streaming outline endpoint ---
@router.post("/", response_model=GenerateResponse)
async def llm_generate(request: Request, stream: bool = Query(False)):
    body = await request.json()
    prompt = body.get("prompt", "").strip()
    user_id = body.get("user_id")
    if not prompt or not user_id:
        raise HTTPException(400, "Missing 'prompt' or 'user_id'")
    system_prompt = get_outline_prompt(prompt)
    logger.info(f"[generate] Prompt received: {prompt[:80]}... | stream={stream}")

    if stream:
        # Server‑sent events format
        async def event_generator():
            try:
                async for chunk in stream_generate_content(system_prompt):
                    # wrap each chunk as SSE
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception:
                logger.exception("[generate] Streaming error")
                yield "data: {\"error\":\"Streaming failed.\"}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    # non‑streaming
    try:
        content = await generate_content(system_prompt)
        logger.info(f"[generate] LLM response length={len(content)}")
        return GenerateResponse(content=content)
    except Exception as e:
        logger.exception("[generate] Error during LLM generation")
        raise HTTPException(500, str(e))


# --- Full course builder endpoint ---
@router.post("/full/", response_model=CourseCreate)
async def generate_full_course(request: Request):
    body = await request.json()

    outline = body.get("outline")
    if isinstance(outline, str):
        try:
            outline = json.loads(outline)
        except json.JSONDecodeError:
            raise HTTPException(400, detail="Outline is invalid JSON")
        
    if isinstance(outline, dict) and "lessons" in outline:
        outline = outline["lessons"]

    print("[DEBUG] Final outline used:", outline)
    print("[DEBUG] outline type:", type(outline), "value:", outline)

    prompt = body.get("prompt", "").strip()
    user_id = body.get("user_id")

    if not prompt or not user_id:
        raise HTTPException(400, "Prompt and user_id are required")

    clean_topic = (
        prompt.replace("I want to learn about", "")
        .replace("Tell me about", "")
        .replace("Teach me", "")
        .replace("What is", "")
        .strip().capitalize()
    )

    logger.info(f"[generate/full] Building full course for: {prompt[:80]}...")


    try:
        # 1) Determine outline
        if outline:
            logger.info("[generate/full] Using outline provided by frontend...")
            lessons_meta = [
                {"title": item["title"], "summary": item["summary"]}
                for item in outline
            ]
        else:
            logger.info("[generate/full] No outline provided — generating with LLM...")
            outline_prompt = f"""
            You're an expert curriculum designer. Based on the user's topic, generate a course outline.

            Instructions:
            - You decide the number of lessons for the topic given by the user.
            - If you think that the topic the user gave needs only 1 or two lessons, because it is a short topic, then make it like that. For example, if the user gives a topic like "SQL Join Operations", then make the course outline for just that one lesson.
            - Similarly, if you think that the topic the user gave is broad, which comprises many chapters, then make each lesson for a respective chapter. For example, if the user gives a topic like "Python programming", then this will have all the lessons, like data types, operators, control flow (conditionals and loops), functions, and object-oriented programming (OOP), etc.
            - So yeah you think and decide the appropriate number of lessons needed to be generated as per the user's topic.
            - For each lesson, use the format:
            - Lesson number., Title:, A concise Summary
            - Do NOT include quizzes, videos, or any extra text.
            - Only output the lessons in numbered list format.

            Topic: {prompt}
            """

            outline_raw = await generate_content(outline_prompt)
            logger.info(f"[generate/full] Raw outline returned:\n{outline_raw}")
            lessons_meta = parse_outline_to_lessons(outline_raw)

        if not lessons_meta:
            logger.warning("[generate/full] No lessons parsed from outline.")
            raise HTTPException(400, detail="Could not parse course outline.")

        # 2) Generate each lesson: content, videos, quiz
        all_videos = []
        SPAM_KEYWORDS = [
        "whatsapp", "appointment", "call now", "join our app", "classplus", "live meeting",
        "course link", "11:11", "telegram", "follow me", "personal session", "ravi3041", "hubtuoyug"
        ]

        def is_spammy(description: str) -> bool:
            desc = description.lower()
            return any(keyword in desc for keyword in SPAM_KEYWORDS)
    
        full_lessons = []
        for meta in lessons_meta:
            title = meta["title"]
            summary = meta["summary"]
            logger.info(f"[generate/full] Generating lesson: {title}")

            lesson_prompt = (
                f"You are an expert technical educator, curriculum designer, and professional textbook author.\n"
                f"Your task is to generate a single, standalone lesson in **Markdown** that is polished, engaging, and at least 1000 words long (excluding code blocks, tables, and lists). Every lesson produced must be “pure gold” — pedagogically robust, crystal‑clear, and immediately actionable.\n\n"
                "## Lesson Context\n"
                f"Title: {title}\n"
                f"Summary: {summary}\n\n"
                "## Uncompromising Quality Guidelines\n\n"
                "1. **Introduction & Motivation**  \n"
                "   - Begin with a vivid real‑world scenario or question to spark curiosity.  \n"
                "   - Explain *why* the topic matters now (applications, industry relevance, everyday life).  \n"
                "   - State 3–5 precise learning objectives as bullet points.\n\n"
                "2. **Logical Progression & Chunking**  \n"
                "   - Break the content into 4–6 major sections (`## Section Name`) that build from simple to complex.  \n"
                "   - Within each section, use 2–3 subsections (`### Subsection Name`) for focused ideas or steps.\n\n"
                "3. **Pedagogical Enhancements**  \n"
                "   - **Concept Quiz:** After introducing a key concept, insert a very short “Check Your Understanding” question (one sentence).  \n"
                "   - **Analogy Spotlight:** Provide at least one vivid analogy per section to anchor abstract ideas in everyday experience.  \n"
                "   - **Common Pitfalls:** In each major section, include a **Warning:** block highlighting 1–2 misconceptions and how to avoid them.\n\n"
                "4. **Worked Examples & Practice**  \n"
                "   - For analytical topics (Math, Physics, CS, Engineering):  \n"
                "     - Include **4–6 detailed worked examples** with step‑by‑step reasoning, diagrams (ASCII or descriptive), and “Why this step?” explanations.  \n"
                "     - Add **5–7 practice problems** at the end with brief answer hints or full solutions in a collapsible block (using `<details>` if desired).  \n"
                "   - For conceptual or qualitative topics:  \n"
                "     - Include **3 realistic scenarios** illustrating the concept in different contexts.  \n"
                "     - Provide **3 reflective questions** prompting learners to apply the idea to their own projects.\n\n"
                "5. **Formatting & Accessibility**  \n"
                "   - Use callout blocks: **Note:** for extra tips, **Tip:** for best practices, **Warning:** for pitfalls.  \n"
                "   - Present formulas/code in fenced blocks, labeling language or math.  \n"
                "   - Provide alt‑text descriptions for any mentioned diagrams or images.  \n"
                "   - Use tables for comparisons, flowcharts as ASCII diagrams, and numbered lists for procedures.\n\n"
                "6. **Reinforcement & Reflection**  \n"
                "   - After each major section, include a **Key Takeaways** box with 3–5 bullets.  \n"
                "   - Insert a short **Reflection Prompt** encouraging learners to write or think (e.g., “How would you explain X to a peer?”).\n\n"
                "7. **Conclusion & Next Steps**  \n"
                "   - Conclude with a concise **Recap** tying back to the learning objectives.  \n"
                "   - Suggest 3 curated **Further Reading & Resources** (articles, videos, docs) with 1‑line annotations.  \n"
                "   - End with an **Action Challenge**: a small project or experiment to solidify understanding.\n\n"
                "8. **Tone & Style**  \n"
                "   - Maintain a confident, supportive, and jargon‑free voice.  \n"
                "   - Write in second person (“you”) to engage the learner.  \n"
                "   - Keep paragraphs to 2–4 sentences; use whitespace generously.\n\n"
                "9. **Length & Depth**  \n"
                "   - Ensure the lesson is deep enough to satisfy intermediate learners but clear enough for motivated beginners.  \n"
                "   - Enforce a minimum of **1000 words** (excluding structural elements), but prioritize clarity over fluff.\n\n"
                "Stay laser‑focused on the given Title and Summary. Do not reference any other lessons, external platforms, or hypothetical prerequisites. All content must be original, accurate, and designed to deliver maximum learning impact.\n"
            )

            content = await generate_content(lesson_prompt)
            content = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            logger.info(f"[generate/full] Lesson content for '{title}':\n{content[:3000]}")

            search_query = title
            videos_raw = await fetch_videos(search_query, max_results=3)
            logger.info(f"[generate/full] Raw videos for '{search_query}': {videos_raw}")

            # Filter raw videos for this lesson
            clean_lesson_videos = []

            for video in videos_raw:
                logger.debug(f"Checking video: {video.title} | Thumbnail: {getattr(video, 'thumbnail', '')} | Description: {getattr(video, 'description', '')}")
                if not getattr(video, "thumbnail", "") or "http" not in getattr(video, "thumbnail", ""):
                    logger.debug("Filtered out: missing or invalid thumbnail")
                    continue
                if hasattr(video, "description") and is_spammy(video.description):
                    logger.debug("Filtered out: spammy description")
                    continue
                clean_lesson_videos.append(video)
                all_videos.append(video)

            quiz_prompt = QUIZ_PROMPT_TEMPLATE.format(num_questions=5, lesson_content=content)

            quiz_raw = await generate_content(quiz_prompt)
            logger.info(f"[generate/full] Raw quiz:\n{quiz_raw}")

            # Clean up quiz_raw
            quiz_raw = re.sub(r"<think>.*?</think>", "", quiz_raw, flags=re.DOTALL | re.IGNORECASE)
            quiz_raw = quiz_raw.strip()

            # Extract JSON block if wrapped in markdown
            json_match = re.search(r"```json\s*(.*?)\s*```", quiz_raw, re.DOTALL)
            if json_match:
                quiz_raw = json_match.group(1)

            parsed_mcqs = robust_parse_mcqs(quiz_raw)

            mcqs = []
            seen_questions = set()
            for idx, m in enumerate(parsed_mcqs):
                try:
                    # Ensure options is a list of 4 non-empty strings
                    options = m.get("options", [])
                    options = [opt for opt in options if isinstance(opt, str) and opt.strip()]
                    if len(options) < 4:
                        logger.warning(f"[Quiz Q{idx+1}] Skipped: fewer than 4 options")
                        continue

                    # Ensure question is unique and non-empty
                    question_text = m.get("question", "").strip()
                    if not question_text or question_text in seen_questions:
                        logger.warning(f"[Quiz Q{idx+1}] Skipped: duplicate or empty question")
                        continue
                    seen_questions.add(question_text)

                    # Ensure answer is present and matches one of the options
                    answer = m.get("answer", "").strip()
                    if not answer or answer not in options:
                        logger.warning(f"[Quiz Q{idx+1}] Skipped: answer missing or not in options")
                        continue

                    mcq = MCQ(
                        question=question_text,
                        options=options,
                        answer=answer
                    )
                    mcqs.append(mcq)
                    logger.debug(f"[Quiz Q{idx+1}] {mcq.question} | Answer: {mcq.answer}")
                except Exception as e:
                    logger.warning(f"[Quiz Q{idx+1}] Skipped due to parse error: {e}")

            # Check if no valid MCQs were generated
            if not mcqs:
                logger.warning(f"[Quiz] No valid MCQs generated for lesson '{title}'. Adding placeholder.")
                mcqs.append(MCQ(
                    question="No valid quiz questions could be generated for this lesson.",
                    options=["N/A", "N/A", "N/A", "N/A"],
                    answer="N/A"
                ))

            full_lessons.append(Lesson(
            id=str(uuid4()),
            title=title,
            summary=summary,
            content=content,
            videos=clean_lesson_videos,
            quiz=mcqs
        ))

        logger.info(f"[generate/full] Total videos attached: {len(clean_lesson_videos)}")

        # Extract all quizzes to send as a top-level array
        all_quizzes: List[Quiz] = []
        for lesson in full_lessons:
            if lesson.quiz:
                all_quizzes.append(
                    Quiz(
                        lesson_id=lesson.id,
                        lesson_title=lesson.title,
                        questions=[q.model_dump() for q in lesson.quiz]
                    )
                )


        generated_course = CourseCreate(
            user_id=user_id,
            title=f"Course on {clean_topic}",
            description=f"An AI-generated course on {clean_topic}",
            lessons=full_lessons,
            videos=all_videos,
            quizzes=all_quizzes,
        )

        if len(full_lessons) > 0:
            logger.info("[generate/full] ✅ Course successfully generated with all components.")

        # Save course and retrieve all components with IDs
        saved_course_data = await create_course(generated_course)

        # We now fetch the inserted course + its associated lessons
        saved_course = {
            "id": saved_course_data.id,
            "user_id": user_id,
            "title": saved_course_data.title,
            "description": saved_course_data.description,
            "lessons": saved_course_data.lessons,   # lessons WITH IDs (assuming supabase insert + select is implemented)
            "videos": all_videos,
            "quizzes": [q.model_dump() for q in all_quizzes],
        }
        logger.info(f"[generate/full] Saved course ID: {saved_course['id']}")
        return JSONResponse(content={
        "message": "Course successfully generated",
        "course_id": saved_course_data.id,
        "title": saved_course_data.title
    })


    except Exception:
        logger.exception("[generate/full] Full course generation failed")
        raise HTTPException(500, "Failed to generate full course.")
