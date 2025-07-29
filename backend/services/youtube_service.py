# backend/services/youtube_service.py

import os
import logging
import httpx
from backend.models.schemas import VideoItem
from typing import List
from hashlib import sha256
from unidecode import unidecode

logger = logging.getLogger("uvicorn.error")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

PREFERRED_CHANNELS = [
    "khan academy",
    "3blue1brown",
    "crashcourse",
    "nptel",
    "cs50",
    "veritasium",
    "gate smashers",
    "apna college",
    "jenny lectures",            # aka Jenny's lectures CS/IT NET&JRF
    "abdul bari",
    "code with harry",
    "mycodeschool",
    "freecodecamp.org",
    "the coding train",
    "simplilearn",
    "edureka",
    "geeksforgeeks",
    "telusko",
    "academind",
    "corey schafer",
    "thenewboston",
    "giraffe academy",
    "wired",
    "real engineering",
    "minutephysics",
    "minuteearth",
    "asapscience",
    "study iq education",
    "unacademy",
    "byju's",
    "physics wallah",
    "mathologer",
    "numberphile",
    "logical indian",
    "iit lectures",
    "learn engineering",
    "gate academy",
    "gate lectures by ravindrababu ravula",
    "gate wallah",
    "codebasics",
    "tech with tim",
    "microsoft developer",
    "sentdex",
    "deeplizard",
    "statquest with josh starmer",
    "ai coffee break with letitia",
    "two minute papers",
    "intellipaat",
    "edspresso",
]

MIN_VIEWS = 10_000
MIN_DURATION_SECONDS = 300  # 5 minutes

def enhance_query(query: str) -> str:
    return (
        f"{query} tutorial OR course OR lecture OR explained OR example OR walkthrough "
        f"-shorts -song -music -trailer -review -reaction -prank"
    )

def normalize_title(title: str) -> str:
    return sha256(unidecode(title.lower().strip()).encode()).hexdigest()

def is_relevant(title: str, description: str, query: str) -> bool:
    required_keywords = query.lower().split()
    content = f"{title} {description}".lower()
    matches = sum(1 for kw in required_keywords if kw in content)
    return matches >= max(1, len(required_keywords) // 2)

def parse_iso_duration(duration: str) -> int:
    import isodate
    try:
        return int(isodate.parse_duration(duration).total_seconds())
    except:
        return 0

async def fetch_videos(query: str, max_results: int = 10) -> List[VideoItem]:
    enhanced_query = enhance_query(query)
    search_params = {
        "part": "snippet",
        "q": enhanced_query,
        "type": "video",
        "videoEmbeddable": "true",
        "safeSearch": "strict",
        "maxResults": 25,
        "order": "relevance",
        "key": YOUTUBE_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Step 1: Search
            search_response = await client.get(SEARCH_URL, params=search_params)
            search_response.raise_for_status()
            items = search_response.json().get("items", [])
            video_ids = [item["id"]["videoId"] for item in items if "videoId" in item["id"]]
            if not video_ids:
                logger.warning("No video results found.")
                return []

            # Step 2: Get video details
            details_params = {
                "part": "snippet,contentDetails,statistics",
                "id": ",".join(video_ids),
                "key": YOUTUBE_API_KEY,
            }
            details_response = await client.get(VIDEOS_URL, params=details_params)
            details_response.raise_for_status()
            videos = details_response.json().get("items", [])

            seen_titles = set()
            filtered = []

            for v in videos:
                try:
                    vid_id = v["id"]
                    snippet = v["snippet"]
                    stats = v.get("statistics", {})
                    content = v.get("contentDetails", {})

                    title = snippet["title"]
                    description = snippet.get("description", "")
                    channel = snippet["channelTitle"]
                    duration = parse_iso_duration(content.get("duration", "PT0M"))
                    views = int(stats.get("viewCount", 0))
                    publish_date = snippet.get("publishedAt", "")

                    norm_title = normalize_title(title)
                    if norm_title in seen_titles:
                        logger.debug(f"Duplicate title skipped: {title}")
                        continue
                    seen_titles.add(norm_title)

                    if views < MIN_VIEWS:
                        logger.debug(f"Skipped '{title}' - low views: {views}")
                        continue

                    if duration < MIN_DURATION_SECONDS:
                        logger.debug(f"Skipped '{title}' - too short: {duration}s")
                        continue

                    if not is_relevant(title, description, query):
                        logger.debug(f"Skipped '{title}' - not relevant to topic")
                        continue

                    is_preferred = any(pc in channel.lower() for pc in PREFERRED_CHANNELS)

                    filtered.append({
                        "video_id": vid_id,
                        "title": title,
                        "description": description,
                        "thumbnail": snippet["thumbnails"]["high"]["url"],
                        "channel": channel,
                        "views": views,
                        "duration": duration,
                        "publishedAt": publish_date,
                        "priorityBoost": is_preferred,
                    })

                except Exception as e:
                    logger.warning(f"Error processing video: {e}")
                    continue

            # Sort by boost, views, and recentness
            filtered.sort(
                key=lambda x: (x["priorityBoost"], x["views"], x["publishedAt"]),
                reverse=True
            )

            return [
                VideoItem(
                    video_id=vid["video_id"],
                    title=vid["title"],
                    description=vid["description"],
                    thumbnail=vid["thumbnail"],
                    url=f"https://youtube.com/watch?v={vid['video_id']}"
                )
                for vid in filtered[:max_results]
            ]

    except httpx.RequestError as e:
        logger.error(f"[YouTube] Network error: {e}")
        raise RuntimeError("YouTube API network error")
    except httpx.HTTPStatusError as e:
        logger.error(f"[YouTube] Bad response: {e.response.status_code} - {e.response.text}")
        raise RuntimeError("YouTube API error")
    except Exception as e:
        logger.exception("[YouTube] Unexpected error while fetching videos")
        raise RuntimeError("Internal error fetching YouTube videos")