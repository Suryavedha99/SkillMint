import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL // make sure this exists in `.env`

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
import type { CustomCourse } from "./types"

export async function saveCustomCourse(course: CustomCourse) {
  const res = await fetch(`${BACKEND_URL}/courses/custom`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  })

  if (!res.ok) throw new Error("Failed to save course")
  return res.json()
}

export async function getUserCourses(userId: string) {
  const res = await fetch(`${BACKEND_URL}/courses/custom?user_id=${userId}`)
  if (!res.ok) throw new Error("Failed to fetch courses")
  return res.json()
}

export async function getCourseById(courseId: string) {
  const res = await fetch(`${BACKEND_URL}/courses/custom/${courseId}`)
  if (!res.ok) throw new Error("Failed to load course")
  return res.json()
}

export const getSavedCourses = async (user_id: string) => {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/user/${user_id}`)
  if (!res.ok) throw new Error("Failed to fetch courses")
  return res.json()
}

export async function createGenerateStream(payload: {
  prompt: string,
  user_id: string
}): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${BACKEND_URL}/generate/outline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok || !res.body) {
    throw new Error("Failed to start generation stream")
  }
  return res.body
}

export async function buildCourse(payload: {
  prompt: string,
  user_id: string
}): Promise<{ id: string }> {
  const res = await fetch(`${BACKEND_URL}/courses/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error("Build failed: " + err)
  }
  return res.json()
}