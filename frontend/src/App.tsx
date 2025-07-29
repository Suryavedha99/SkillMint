import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Course from "@/pages/Course";
import SavedCourses from "@/pages/SavedCourses";
import CourseBuilder from "@/pages/CourseBuilder";
import CourseMaterial from "@/pages/CourseMaterial";
import Quiz from "@/pages/Quiz";
import Lesson from "@/pages/Lesson";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
        <SidebarProvider>
          <div className="min-h-screen w-full dark">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="course/:id?" element={<Course />} />
                <Route path="saved" element={<SavedCourses />} />
                <Route path="course-builder" element={<CourseBuilder />} />
                <Route path="course-material/:id" element={<CourseMaterial />} />
                <Route path="lesson/:courseId/:lessonId" element={<Lesson />} />
                <Route path="quiz/:courseId/:lessonId" element={<Quiz />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </SidebarProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;