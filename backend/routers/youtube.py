# backend/routers/youtube.py

from fastapi import APIRouter, HTTPException, Query
from backend.models.schemas import YoutubeRequest
from backend.services.youtube_service import fetch_videos
from backend.models.schemas import YoutubeResponse
from backend.models.schemas import VideoItem
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

@router.post("/search", response_model=YoutubeResponse, tags=["YouTube"])
async def search_videos(request: YoutubeRequest):
    """
    Fetch relevant YouTube videos for a lesson
    """
    try:
        logger.info(f"[youtube] Searching for: {request.query}")
        videos = await fetch_videos(request.query, max_results=5)
        logger.info(f"[youtube] Found {len(videos)} videos")
        return YoutubeResponse(videos=videos)
    except Exception as e:
        logger.exception(f"[youtube] Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail="YouTube search failed")

@router.get("/search-youtube", response_model=YoutubeResponse, tags=["YouTube"])
async def search_youtube(
    q: str = Query(..., min_length=1, description="Search term"),
    max_results: int = Query(5, ge=1, le=20, description="Max number of videos to fetch")
):
    """
    Search YouTube for videos matching `q`.
    """
    try:
        videos: List[VideoItem] = await fetch_videos(q, max_results=max_results)
        return YoutubeResponse(videos=videos)
    except Exception as e:
        logger.exception(f"[youtube] Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail="YouTube search failed")