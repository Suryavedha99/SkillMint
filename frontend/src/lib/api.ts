const BASE_URL = import.meta.env.VITE_BACKEND_URL;
import axios from "axios";

export async function createCourse(course: any) {
  const res = await fetch(`${BASE_URL}/courses/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(course)
  });

  if (!res.ok) {
    throw new Error("Failed to create course");
  }

  return await res.json();
}

// Fetch only this user's courses
export async function getSavedCourses(userId: string): Promise<any[]> {
  const response = await axios.get<any[]>(
    `${import.meta.env.VITE_BACKEND_URL}/courses/`,
    { params: { user_id: userId } }
  );
  return response.data;
}

// Fetch per-course progress summary
export async function getCourseProgress(
  courseId: string,
  userId: string
): Promise<{
  total_lessons: number;
  completed_lessons: number;
}> {
  const response = await axios.get<{
    total_lessons: number;
    completed_lessons: number;
  }>(
    `${import.meta.env.VITE_BACKEND_URL}/progress/course/${courseId}`,
    { params: { user_id: userId } }
  );
  return response.data;
}


export async function createGenerateStream({
  prompt,
  user_id
}: {
  prompt: string;
  user_id: string;
}) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate/?stream=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, user_id }),
  });

  if (!res.body) throw new Error("No streaming body from server");
  return res.body;
}

export async function buildCourse(payload: {
  prompt: string;
  user_id: string;
  outline: { title: string; summary: string }[];
}) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate/full/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: payload.prompt,
      user_id: payload.user_id,
      outline: {
        lessons: payload.outline, // ✅ wrap lessons in `outline`
      },
    }),
  });

  if (!res.ok) throw new Error("Build failed");
  return res.json();
}

export async function searchYouTube(query: string) {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) throw new Error("YouTube search failed");
  return await response.json(); // returns { videos: [...] }
}

export async function getCourse(id: string) {
  const response = await axios.get(
    `${import.meta.env.VITE_BACKEND_URL}/courses/${id}`
  );
  if (response.status !== 200) {
    throw new Error(`Failed to fetch course ${id}`);
  }
  return response.data;
}

export async function submitLessonProgress({
  user_id,
  course_id,
  lesson_id,
}: {
  user_id: string;
  course_id: string;
  lesson_id: number;
}) {
  const res = await fetch(`${BASE_URL}/progress/lesson`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id, course_id, lesson_id }),
  });

  if (!res.ok) throw new Error("Failed to submit progress");
}