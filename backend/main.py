# backend/main.py

import os
from dotenv import load_dotenv, find_dotenv

# 1) Load environment variables early
load_dotenv(find_dotenv())

# 2) Standard imports
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# 3) Routers
from backend.routers.generate import router as generate_router
from backend.routers.youtube import router as youtube_router
from backend.routers.quiz import router as quiz_router
from backend.routers.courses import router as courses_router
from backend.routers.custom_courses import router as custom_courses_router
from backend.routers.progress import router as progress_router
from backend.routers.lessons import router as lessons_router

# 4) Logging Middleware
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("uvicorn.error")

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        logger.info(f"Incoming request: {request.method} {request.url}")
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response

# 5) Lifespan events
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("✅ SkillMint backend starting up...")
    yield
    logger.info("🔴 SkillMint backend shutting down...")

# 6) Create FastAPI app
app = FastAPI(
    title="SkillMint Backend",
    version="0.1.0",
    description="Backend APIs for generating AI-powered courses.",
    lifespan=lifespan,
    redirect_slashes=False
)

# 7) Add middlewares (CORS must be before custom middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080","https://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

# 8) Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# 9) Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}

# 10) Include routers (prefix only where needed)
app.include_router(generate_router)
app.include_router(youtube_router, prefix="/api")
app.include_router(quiz_router)
app.include_router(courses_router)
app.include_router(custom_courses_router)
app.include_router(progress_router)
app.include_router(lessons_router)

# 11) Dev CLI entry
if __name__ == "__main__":
    import uvicorn

    print("✅ Registered Routes:")
    for route in app.routes:
        print(f"{route.path} [{', '.join(route.methods)}]")

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
