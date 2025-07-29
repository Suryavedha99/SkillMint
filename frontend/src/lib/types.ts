// src/lib/types.ts

import { Payload } from "recharts/types/component/DefaultLegendContent";

// --- YouTube ---
export interface VideoItem {
  video_id: string;
  title: string;
  description: string;
  thumbnail: string;
  url?: string; // optional full URL
}

// --- Quiz / MCQ ---
export interface MCQ {
  question_id?: string | number;  // id from backend
  question: string;
  options: string[];
  answer?: string; // correct answer text
  correctAnswer?: number; // index of the correct option (for UI logic)
}

// --- Lesson ---
export interface Lesson {
  id?: string | number;
  title: string;
  summary?: string;
  content?: string;
  videos?: VideoItem[];
  quiz?: MCQ[];
}

// --- Course Data Structures ---
export interface CourseCreate {
  user_id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

export interface CourseOut extends CourseCreate {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
  lessonsCount?: number;
  progress?: number; // percentage
  tags?: string[];
}

// --- Progress Tracking ---
export interface ProgressEntry {
  user_id: string;
  course_id: string;
  lesson_id?: string;
  quiz_id?: string;
  completed: boolean;
  timestamp: string;
}

// --- Types for API streams ---
export interface GenerateStreamRequest {
  prompt: string;
  user_id: string;
}

export interface GenerateStreamResponseChunk {
  // chunk of text
  text: string;
}

export interface CustomCourse {
  user_id: string;
  title: string;
  description?: string;
  lessons: Payload[];
}