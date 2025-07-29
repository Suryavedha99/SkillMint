import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Lesson = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/courses/${courseId}`);
        if (!res.ok) throw new Error("Failed to fetch course");
        const data = await res.json();

        const selectedLesson = data.lessons.find((l: any) => l.id === lessonId);
        if (!selectedLesson) throw new Error("Lesson not found");

        setLesson(selectedLesson);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [courseId, lessonId]);


  const handleFinishLesson = () => {
    toast({
      title: "Lesson Completed!",
      description: `You have successfully completed "${lesson.title}"`
    });

    navigate(`/course-material/${courseId}?completed=${lessonId}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-20 text-center">
        <p className="text-muted-foreground">Loading lesson...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Course
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate(`/course-material/${courseId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        <div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-2">
            {lesson.title}
          </Badge>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
        </div>
      </div>

      {/* Lesson Content */}
      <Card className="p-10 md:p-14 gradient-card border-border">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {lesson.content}
          </ReactMarkdown>
        </div>
      </Card>

      {/* Finish Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleFinishLesson}
          className="gradient-primary hover:shadow-elegant transition-smooth px-8 py-3"
          size="lg"
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Finished Lesson
        </Button>
      </div>
    </div>
  );
};

export default Lesson;