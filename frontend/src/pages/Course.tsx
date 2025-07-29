import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, FileText, HelpCircle, Clock, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
const Course = () => {
  const { id } = useParams<{ id: string }>();
  const course_id = id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [courseData, setCourseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${course_id}`);
        if (!res.ok) throw new Error("Failed to fetch course");
        const data = await res.json();
        setCourseData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Something went wrong");
        toast({
          title: "Error loading course",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [course_id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-muted-foreground">Loading course...</p>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <p className="text-destructive">Failed to load course.</p>
      </div>
    );
  }


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Course Header */}
      <Card className="p-8 gradient-card border-border shadow-card">
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{courseData.title}</h1>
            <p className="text-muted-foreground text-lg">{courseData.description}</p>
          </div>
          <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
            {courseData.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {courseData.lessons.length} Lessons
          </div>
        </div>
      </Card>

      {/* Course Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Lessons */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">Course Lessons</h2>
          
          {courseData.lessons.map((lesson, index) => (
            <Card key={lesson.id} className="p-6 gradient-card border-border hover:shadow-card transition-smooth">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-semibold">{lesson.title}</h3>
                  </div>
              </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/lesson/${course_id}/${lesson.id}`)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Lesson
                </Button>
              </div>

              <div className="ml-11 space-y-4">
                <p className="text-muted-foreground">{lesson.summary}</p>
                
                {/* Videos */}
                {lesson.videos?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Videos</h4>
                    {lesson.videos.map((video, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Play className="w-3 h-3" />
                        {video.title}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quiz Preview */}
                {Array.isArray(lesson.quiz) && lesson.quiz.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-2">Lesson Quiz</h4>
                    <p className="text-sm text-muted-foreground">
                      {lesson.quiz.length} question{lesson.quiz.length !== 1 ? 's' : ''} to test your understanding
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          <Card className="p-6 gradient-card border-border">
            <h3 className="text-lg font-semibold mb-4">Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Lessons Completed</span>
                <span>0/{courseData.lessons.length}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-0 transition-smooth" />
              </div>
              <p className="text-xs text-muted-foreground">
                Track your lesson completion here
              </p>
            </div>
          </Card>

          {/* Course Actions */}
          <Card className="p-6 gradient-card border-border">
            <h3 className="text-lg font-semibold mb-4">Course Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full">
                Save Course
              </Button>
              <Button variant="outline" className="w-full">
                Export as PDF
              </Button>
              <Separator />
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive">
                Delete Course
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Course;