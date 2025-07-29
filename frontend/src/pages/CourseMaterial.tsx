import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, FileText, HelpCircle, Youtube, Edit, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@supabase/auth-helpers-react";
import { getCourseProgress } from "@/lib/api";

const CourseMaterial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [courseData, setCourseData] = useState<any | null>(null);
  const [progress, setProgress] = useState<{
    total_lessons: number;
    completed_lessons: number;
  } | null>(null);

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${id}`);
        if (!res.ok) throw new Error("Failed to fetch course");
        const data = await res.json();
        setCourseData(data);
        console.log("=== Loaded courseData ===", data);
      } catch (err) {
        toast({ title: "Error", description: "Could not load course data", variant: "destructive" });
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id, toast]);

  // Fetch progress once courseData and user are available
  useEffect(() => {
    if (courseData?.id && user) {
      getCourseProgress(courseData.id, user.id)
        .then(setProgress)
        .catch((err) => {
          console.error("Error fetching progress", err);
          setError(true);
        });
    }
  }, [courseData, user]);

  if (loading || !progress) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <p className="text-muted-foreground">Loading course data...</p>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <p className="text-destructive">Failed to load course. Please try again later.</p>
      </div>
    );
  }

  if (
    !courseData.lessons ||
    !courseData.videos ||
    !courseData.quizzes
  ) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <p className="text-muted-foreground">Course content is incomplete or loading...</p>
      </div>
    );
  }

  const navigationItems = [
    ...courseData.lessons.map((lesson: any) => ({ ...lesson, type: "lesson"})),
    ...courseData.videos.map((video: any) => ({ ...video, type: "video" })),
    ...courseData.quizzes.map((quiz: any) => ({ ...quiz, type: "quiz" })),
  ];

  const getIconForType = (type: string) => {
    switch (type) {
      case "lesson": return FileText;
      case "video": return Youtube;
      case "quiz": return HelpCircle;
      default: return FileText;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case "lesson": return "text-primary";
      case "video": return "text-destructive";
      case "quiz": return "text-warning";
      default: return "text-primary";
    }
  };

  const handleStartLesson = (lessonId: string) => navigate(`/lesson/${id}/${lessonId}`);
  const handleVideoClick = (url: string) => window.open(url, '_blank');
  const handleQuiz = (lessonId: string) => navigate(`/quiz/${courseData.id}/${lessonId}`);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-6 gradient-card border-border sticky top-6">
            <h3 className="text-lg font-semibold mb-4">Course Navigation</h3>
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = getIconForType(item.type);
                const isCompleted = item.type === "lesson" && item.index < progress.completed_lessons;

                return (
                  <div
                    key={`${item.type}-${item.id ?? item.index}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-smooth cursor-pointer"
                    onClick={() => {
                      if (item.type === "lesson") handleStartLesson(item.id);
                      else if (item.type === "video") handleVideoClick(item.url);
                      else if (item.type === "quiz") handleQuiz(item.lesson_id);
                    }}
                  >
                    <Icon className={`w-4 h-4 ${getColorForType(item.type)}`} />
                    <span className="text-sm flex-1 line-clamp-1">{item.title}</span>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-success" />}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          {/* Course Header */}
          <Card className="p-6 gradient-card border-border">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{courseData.title}</h1>
                <p className="text-muted-foreground">{courseData.description}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={async () => {
                  if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
                  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${id}`, { method: 'DELETE' });
                  if (res.ok) { toast({ title: "Course Deleted", description: "Course removed." }); navigate('/saved'); }
                  else { toast({ title: "Error", description: "Failed to delete.", variant: 'destructive' }); }
                }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          </Card>

          {/* Lessons */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Lessons</h2>
            {courseData.lessons.map((lesson: any, idx: number) => {
              const finished = idx < progress.completed_lessons;
              return (
                <Card key={lesson.id ?? `lesson-${idx}`} className="p-6 gradient-card border-border hover:shadow-card transition-smooth">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </span>
                      <h3 className="text-xl font-semibold">{lesson.title}</h3>
                    </div>
                    <Button size="sm" variant={finished ? "default" : "outline"} onClick={() => handleStartLesson(lesson.id)}>
                      {finished ? <><CheckCircle className="w-4 h-4 mr-2" /> Completed</> : <><Play className="w-4 h-4 mr-2" /> Start Lesson</>}
                    </Button>
                  </div>
                  <p className="text-muted-foreground ml-11">{lesson.summary}</p>
                </Card>
              );
            })}
          </div>

          {/* Videos */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Videos</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {courseData.videos.map((video: any, idx: number) => (
                <Card key={video.id ?? `video-${idx}`} className="p-4 gradient-card border-border hover:shadow-card transition-smooth cursor-pointer" onClick={() => handleVideoClick(video.url)}>
                  <div className="relative">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-32 object-cover rounded" />
                    <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Youtube className="w-4 h-4 text-destructive" />
                    <h3 className="font-medium line-clamp-2">{video.title}</h3>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Quizzes */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Quizzes</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {courseData.quizzes.map((quiz: any, idx: number) => (
                <Card key={quiz.id || `quiz-${idx}`} className="p-6 gradient-card border-border hover:shadow-card transition-smooth">
                  <div className="flex items-center gap-3 mb-3">
                    <HelpCircle className="w-6 h-6 text-warning" />
                    <h3 className="text-lg font-semibold">{quiz.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{quiz.questions.length} questions to test your understanding</p>
                  <Button className="w-full" onClick={() => handleQuiz(quiz.lesson_id)}>
                    Take Quiz
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseMaterial;
