import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, X, Save, Youtube, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { saveCustomCourse } from "@/lib/utils"
import { useUser } from "@supabase/auth-helpers-react"
import { createCourse, searchYouTube, getCourse } from "@/lib/api";
import { useSearchParams } from "react-router-dom";

const CourseBuilder = () => {
  const navigate = useNavigate();
  const user = useUser();
  const { toast } = useToast();
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [lessons, setLessons] = useState<any[]>([]);
  const [videoSearch, setVideoSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  useEffect(() => {
    if (editId && user) {
      (async () => {
        const course = await getCourse(editId) as {
          title: string;
          description: string;
          lessons: any[];
        };
        setCourseTitle(course.title);
        setCourseDescription(course.description);
        setLessons(course.lessons);
      })(); // ← call the async IIFE here
    }
  }, [editId, user]);


  const handleVideoSearch = async () => {
    if (!videoSearch.trim()) return;
    try {
      const { videos } = await searchYouTube(videoSearch);
      setSearchResults(videos);
    } catch (err) {
      console.error("YouTube API error:", err);
      toast({
        title: "Error",
        description: "YouTube search failed",
        variant: "destructive",
      });
    }
  };


  const addLesson = () => {
    const newLesson = {
      id: Date.now().toString(),
      title: "",
      content: "",
      videos: []
    };
    setLessons([...lessons, newLesson]);
  };

  const updateLesson = (id: string, field: string, value: string) => {
    setLessons(lessons.map(lesson => 
      lesson.id === id ? { ...lesson, [field]: value } : lesson
    ));
  };

  const deleteLesson = (id: string) => {
    setLessons(lessons.filter(lesson => lesson.id !== id));
  };

  const addVideoToLesson = (lessonId: string, video: any) => {
    setLessons(lessons.map(lesson => 
      lesson.id === lessonId 
        ? { ...lesson, videos: [...lesson.videos, video] }
        : lesson
    ));
  };

  const removeVideoFromLesson = (lessonId: string, videoId: string) => {
    setLessons(lessons.map(lesson => 
      lesson.id === lessonId 
        ? { ...lesson, videos: lesson.videos.filter((v: any) => v.id !== videoId) }
        : lesson
    ));
  };

  const saveCourse = async () => {
    if (!courseTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        title: courseTitle,
        description: courseDescription,
        lessons: lessons,
        user_id: user.id,
      };

      const response = await createCourse(payload);  // <- actual API call
      const course_id = response.id;

      toast({
        title: "Success",
        description: "Course saved successfully!"
      });

      navigate(`/course/${course_id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save course.",
        variant: "destructive"
      });
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Course Builder</h1>
          <p className="text-muted-foreground">Create your own custom course</p>
        </div>
        <Button onClick={saveCourse} className="gradient-primary hover:shadow-elegant transition-smooth">
          <Save className="w-4 h-4 mr-2" />
          Save Course
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Course Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 gradient-card border-border">
            <h2 className="text-xl font-semibold mb-4">Course Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Course Title</label>
                <Input
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Enter course title..."
                  className="bg-background/50 border-border focus:border-primary transition-smooth"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Course Description</label>
                <Textarea
                  value={courseDescription}
                  onChange={(e) => setCourseDescription(e.target.value)}
                  placeholder="Enter course description..."
                  className="bg-background/50 border-border focus:border-primary transition-smooth min-h-24"
                />
              </div>
            </div>
          </Card>

          {/* Lessons */}
          <Card className="p-6 gradient-card border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Course Lessons</h2>
              <Button onClick={addLesson} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Lesson
              </Button>
            </div>

            <div className="space-y-4">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="p-4 bg-muted/20 border-border">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      Lesson {index + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLesson(lesson.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <Input
                      value={lesson.title}
                      onChange={(e) => updateLesson(lesson.id, "title", e.target.value)}
                      placeholder="Lesson title..."
                      className="bg-background/50 border-border focus:border-primary transition-smooth"
                    />
                    <Textarea
                      value={lesson.content}
                      onChange={(e) => updateLesson(lesson.id, "content", e.target.value)}
                      placeholder="Lesson content..."
                      className="bg-background/50 border-border focus:border-primary transition-smooth min-h-20"
                    />
                    
                    {/* Videos for this lesson */}
                    {lesson.videos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Videos:</p>
                        {lesson.videos.map((video: any) => (
                          <div key={video.id} className="flex items-center gap-2 p-2 bg-background/30 rounded">
                            <Youtube className="w-4 h-4 text-destructive" />
                            <span className="text-sm flex-1">{video.title}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeVideoFromLesson(lesson.id, video.id)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* YouTube Search */}
        <div className="space-y-6">
          <Card className="p-6 gradient-card border-border">
            <h3 className="text-lg font-semibold mb-4">YouTube Videos</h3>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="Search YouTube videos..."
                  className="bg-background/50 border-border focus:border-primary transition-smooth"
                  onKeyDown={(e) => e.key === "Enter" && handleVideoSearch()}
                />
                <Button onClick={handleVideoSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Search Results:</p>
                  {searchResults.map((video) => (
                    <Card key={video.video_id} className="p-3 bg-muted/20 border-border">
                      <div className="flex gap-3">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-16 h-12 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                          <div className="flex gap-1 mt-2">
                            {lessons.map((lesson,index) => (
                              <Button
                                key={lesson.id}
                                size="sm"
                                variant="outline"
                                onClick={() => addVideoToLesson(lesson.id, video)}
                                className="text-xs h-6"
                              >
                                + L{index + 1}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseBuilder;