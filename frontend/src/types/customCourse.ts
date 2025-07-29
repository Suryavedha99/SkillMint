export type Lesson = {
  title: string
  content: string
  summary: string
}

export type Video = {
  title: string
  url: string
}

export type CustomCourse = {
  id?: number
  user_id: string
  title: string
  description?: string
  lessons: Lesson[]
  videos: Video[]
}
