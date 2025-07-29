from pydantic import BaseModel, Field
from typing import List, Optional
from backend.models.lesson import Lesson, MCQ, YoutubeResponse
from uuid import uuid4

class OutlineItem(BaseModel):
    title: str
    summary: str

# --- Generation ---
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5, description="Prompt to generate content")
    user_id: str
    outline: Optional[List[OutlineItem]] = None

class GenerateResponse(BaseModel):
    content: str
    

# --- YouTube ---
class YoutubeRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Search query for YouTube")

class VideoItem(BaseModel):
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    description: str = Field(..., description="Video description")
    thumbnail: str = Field(..., description="URL to video thumbnail")
    url: str = Field(..., description="URL to video")

class YoutubeResponse(BaseModel):
    videos: List[VideoItem]

# --- Quiz ---
class Quiz(BaseModel):
    lesson_id: str
    lesson_title: str
    questions: List[MCQ]

class MCQ(BaseModel):
    question: str
    options: List[str]
    answer: str

class QuizRequest(BaseModel):
    question: str = Field(..., min_length=5)
    options: List[str]
    answer: str = Field(..., min_length=1)

class QuizResponse(BaseModel):
    feedback: str

# --- Courses ---
class Lesson(BaseModel):
    id: str
    title: str
    content: Optional[str] = None
    videos: Optional[List[VideoItem]] = None
    quiz: Optional[List[MCQ]] = None
    summary: Optional[str] = None            

class CourseCreate(BaseModel):
    user_id: str                        
    title: str = Field(..., min_length=3)
    description: Optional[str] = None       
    lessons: List[Lesson]
    videos: Optional[List[VideoItem]] = []  
    quizzes: Optional[List[Quiz]] = []             

class CourseOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    lessons: List[Lesson]
    videos: Optional[List[VideoItem]] = None
    quizzes: Optional[List[Quiz]] = None

class BuildCourseRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user building the course")
    prompt: str = Field(..., min_length=5, description="User's learning prompt")

class LessonProgressIn(BaseModel):
    user_id: str
    course_id: str
    lesson_id: str