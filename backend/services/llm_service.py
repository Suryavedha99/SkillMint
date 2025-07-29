# backend/services/llm_service.py

import os
import json
import logging
from typing import AsyncGenerator, List
import httpx

# Load environment variables
LLM_URL = os.getenv("LLM_URL") or "http://localhost:11434/api/generate"  # Ensure trailing slash matches server
MODEL_NAME = os.getenv("LLM_MODEL", "deepseek-r1:1.5b")

# Configure logger
logger = logging.getLogger("uvicorn.error")

# Configure HTTPX client with extended timeouts and redirects enabled
timeout = httpx.Timeout(
    connect=5.0,   # seconds to establish connection
    read=60.0,     # seconds to wait for response data
    write=10.0,    # seconds to send request data
    pool=None,
)
client = httpx.AsyncClient(timeout=60, follow_redirects=True)

async def generate_content(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": True
    }

    try:
        logger.info("=== Sending LLM Prompt ===")
        logger.info(prompt[:500])  # Preview only
        logger.info(f"[LLM] Payload to {LLM_URL}: {payload}")

        full_text = ""

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", LLM_URL, json=payload) as response:
                response.raise_for_status()

                async for chunk in response.aiter_lines():
                    if chunk.strip():
                        try:
                            data = json.loads(chunk)
                            full_text += data.get("response", "")
                        except Exception:
                            logger.warning(f"[LLM] Failed to parse chunk: {chunk[:100]}")

        return full_text.strip()

    except httpx.RequestError as e:
        logger.error(f"[LLM] Request error: {e}")
        raise RuntimeError(f"Failed to contact LLM service at {LLM_URL}: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"[LLM] HTTP error {e.response.status_code}: {e.response.text}")
        raise RuntimeError(f"LLM service error {e.response.status_code}")
    except Exception:
        logger.exception("[LLM] Unexpected error")
        raise RuntimeError("Unexpected error during content generation.")


# 🌊 Streaming generation
async def stream_generate_content(prompt: str) -> AsyncGenerator[str, None]:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": True
    }

    try:
        async with client.stream("POST", LLM_URL, json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    if chunk := data.get("response"):
                        yield chunk
                except json.JSONDecodeError:
                    logger.warning(f"[LLM] Skipping invalid JSON line: {line}")
    except httpx.RequestError as e:
        logger.error(f"[LLM] Streaming request error: {e}")
        yield "[Error: LLM connection failed]"
    except httpx.HTTPStatusError as e:
        logger.error(f"[LLM] Streaming HTTP {e.response.status_code}")
        yield f"[Error: LLM status {e.response.status_code}]"
    except Exception:
        logger.exception("[LLM] Unexpected streaming error")
        yield "[Error: Unexpected streaming failure]"

async def evaluate_quiz_answer(question: str, options: List[str], answer: str) -> str:
    formatted_options = "\n".join([f"{chr(65+i)}. {opt}" for i, opt in enumerate(options)])
    prompt = (
        "Evaluate the user's answer to a multiple-choice question.\n\n"
        f"Question:\n{question}\n\n"
        f"Options:\n{formatted_options}\n\n"
        f"User's Answer:\n{answer}\n\n"
        "Please provide a brief explanation of whether the answer is correct and why."
    )
    return await generate_content(prompt)

async def generate_lesson_quiz(lesson_content: str, num_questions: int = 4) -> List[dict]:
    prompt = (
        f"Create {num_questions} multiple-choice questions from the following lesson content. "
        "Each question must have exactly four options (A, B, C, D) and indicate the correct answer. "
        "Return only a JSON array in the following format:\n\n"
        "[{'question': ..., 'options': [...], 'answer': ...}, ...]\n\n"
        f"Lesson Content:\n{lesson_content}"
    )

    content = await generate_content(prompt)

    try:
        json_start = content.find("[")
        json_end = content.rfind("]") + 1
        quiz_json = content[json_start:json_end]
        return json.loads(quiz_json)
    except Exception:
        logger.exception("[LLM] Failed to parse lesson quiz JSON")
        return []
