from typing import List, Optional
from pydantic import BaseModel

class LessonInput(BaseModel):
    title: str
    content: str

class VideoInput(BaseModel):
    title: str
    url: str

class CustomCourseInput(BaseModel):
    user_id: str
    title: str
    description: Optional[str]
    lessons: List[LessonInput]
    videos: List[VideoInput]

class LessonOutput(LessonInput):
    id: int

class VideoOutput(VideoInput):
    id: int

class CustomCourseOutput(BaseModel):
    id: int
    user_id: str
    title: str
    description: Optional[str]
    lessons: List[LessonOutput]
    videos: List[VideoOutput]
