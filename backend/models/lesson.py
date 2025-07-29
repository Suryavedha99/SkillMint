from pydantic import BaseModel
from typing import List, Optional


class MCQ(BaseModel):
    question: str
    options: List[str]
    answer: str


class YoutubeResponse(BaseModel):
    title: str
    video_id: str
    url: str


class Quiz(BaseModel):
    lesson_title: str
    questions: List[MCQ]


class Lesson(BaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    videos: Optional[List[YoutubeResponse]] = []
    quiz: Optional[List[MCQ]] = []
