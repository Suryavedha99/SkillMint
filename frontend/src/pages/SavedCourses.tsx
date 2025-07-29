import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@supabase/auth-helpers-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Star, Play } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { getSavedCourses } from "@/lib/api";
import { getCourseProgress } from "@/lib/api";

const SavedCourses = () => {
  const navigate = useNavigate();
  const user = useUser();

  const [savedCourses, setSavedCourses] = useState<any[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, {
    total_lessons: number;
    completed_lessons: number;
  }>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      const userId = user.id;

      try {
        const courses = await getSavedCourses(user.id) as any[];
        setSavedCourses(courses);

        const progressEntries = await Promise.all(
          courses.map(async (course: any) => {
            try {
              const progress = await getCourseProgress(course.id, user.id);
              return [course.id, progress] as const;
            } catch (err) {
              console.warn("Failed to fetch progress for course", course.id);
              return [course.id, { total_lessons: 0, completed_lessons: 0 }] as const;
            }
          })
        );
        setProgressMap(Object.fromEntries(progressEntries));
      } catch (err) {
        console.error("Failed to fetch courses", err);
      }
    };
    fetchCourses();
  }, [user]);

  const filteredCourses = savedCourses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course?.tags?.some((tag: string) =>
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-success/10 text-success border-success/20";
      case "Intermediate": return "bg-warning/10 text-warning border-warning/20";
      case "Advanced": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted/10 text-muted-foreground border-muted/20";
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Continue your learning journey with your saved courses
          </p>
        </div>
        <Button
          onClick={() => navigate("/course-builder")}
          className="gradient-primary hover:shadow-elegant transition-smooth"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Create New Course
        </Button>
      </div>

      {/* Search */}
      <Card className="p-6 gradient-card border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by title or tags..."
            className="pl-10 bg-background/50 border-border focus:border-primary transition-smooth"
          />
        </div>
      </Card>

      {/* Course Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Courses",
            value: savedCourses.length,
            icon: BookOpen
          },
          {
            label: "Completed",
            // a course is “completed” when all lessons are done
            value: Object.values(progressMap).filter(
              (p) => p.completed_lessons === p.total_lessons && p.total_lessons > 0
            ).length,
            icon: Star
          },
          {
            label: "In Progress",
            // at least one lesson done but not all
            value: Object.values(progressMap).filter(
              (p) => p.completed_lessons > 0 && p.completed_lessons < p.total_lessons
            ).length,
            icon: Play
          }
        ].map((stat) => (
          <Card key={stat.label} className="p-4 gradient-card border-border">
            <div className="flex items-center gap-3">
              <stat.icon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="p-6 gradient-card border-border hover:shadow-card transition-smooth group">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold group-hover:text-primary transition-smooth mb-2">
                  {course.title}
                  {progressMap[course.id]?.total_lessons > 0 &&
                   progressMap[course.id]?.completed_lessons === progressMap[course.id]?.total_lessons && (
                    <Badge className="ml-2" variant="secondary">
                      Completed
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {course.description ?? "No description available"}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate(`/course-material/${course.id}`)}
              >
                {progressMap[course.id]?.completed_lessons === 0
                  ? "Start Course"
                  : progressMap[course.id]?.completed_lessons === progressMap[course.id]?.total_lessons && progressMap[course.id]?.total_lessons > 0
                    ? "Review Course"
                    : "Continue"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card className="p-12 text-center gradient-card border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery ? "Try adjusting your search terms" : "Start creating your first course!"}
          </p>
          <Button 
            className="gradient-primary hover:shadow-elegant transition-smooth"
            onClick = {() => navigate("/course-builder")}
          >
            Create Your First Course
          </Button>
        </Card>
      )}
    </div>
  );
};

export default SavedCourses;
