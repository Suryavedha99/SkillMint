import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Zap, Target, Users } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { useToast } from "@/components/ui/use-toast";
import { useUser } from "@supabase/auth-helpers-react";
import { createGenerateStream } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { buildCourse } from "@/lib/api";

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [courseOutline, setCourseOutline] = useState("");
  const [showBuildButton, setShowBuildButton] = useState(false);
  const [buildingCourse, setBuildingCourse] = useState(false);
  const user = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const handleGenerateOutline = async () => {
    if (!prompt.trim() || !user) return;
    setIsGenerating(true);
    setShowOutline(true);
    setCourseOutline("");
    setShowBuildButton(false);

    try {
      const stream = await createGenerateStream({ prompt, user_id: user.id });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const raw = decoder.decode(value);
          const lines = raw.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.replace("data: ", ""));
                if (json.chunk) {
                  setCourseOutline((prev) => prev + json.chunk);
                }
              } catch (e) {
                console.error("Failed to parse chunk:", line);
              }
            }
          }

        }
      }
      setIsGenerating(false);
      setShowBuildButton(true);
    } catch (err) {
      console.error("Stream error:", err);
      toast({ title: "Error", description: "Failed to generate outline", variant: "destructive" });
      setIsGenerating(false);
    }
  };

function parseOutlineText(text: string): { title: string; summary: string }[] {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

  const lessons = [];

  for (const line of lines) {
    // Match: Lesson 1. Title: Summary
    const match = line.match(/^Lesson\s*\d+\.\s*(.+?):\s*(.+)$/);
    if (match) {
      const title = match[1].trim();
      const summary = match[2].trim();
      lessons.push({ title, summary });
    }
  }

  return lessons;
}

  const handleBuildCourse = async () => {
    if (!prompt.trim() || !user) return;
    setBuildingCourse(true);

    try {
      const outline = parseOutlineText(courseOutline);
      console.log("🧠 Final outline sent to backend:", outline);

      const result = await buildCourse({
        prompt,
        user_id: user.id,
        outline,
      });

      console.log("🎯 Build result:", result); // 🔍 Logs what backend returned
      if (!result?.course_id) throw new Error("Failed to build course");

      console.log("🧭 Navigating to course:", result.course_id);
      navigate(`/course/${result.course_id}`);

      toast({
        title: "Course Built Successfully!",
        description: "Your course is ready to explore",
      });

      navigate(`/course/${result.course_id}`);
    } catch (err) {
      console.error("❌ Build error:", err);
      toast({
        title: "Error",
        description: "Failed to build course",
        variant: "destructive",
      });
    } finally {
      setBuildingCourse(false);
    }
  };


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold leading-tight">
          Transform Ideas into 
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Complete Courses
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          AI-powered course builder that creates structured lessons, quizzes, and curated videos in seconds. 
          Just describe what you want to learn.
        </p>
      </div>

      {/* Course Generation Interface */}
      <Card className="p-8 gradient-card border-border shadow-card">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">What do you want to learn?</h2>
            <p className="text-muted-foreground">
              Enter your learning topic and let AI create a comprehensive course for you
            </p>
          </div>

          <div className="flex gap-3">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Machine Learning for Beginners, Web Development with React..."
              className="text-lg py-6 bg-background/50 border-border focus:border-primary transition-smooth"
              onKeyDown={(e) => e.key === "Enter" && handleGenerateOutline()}
            />
            <Button
              onClick={handleGenerateOutline}
              disabled={!prompt.trim() || isGenerating}
              size="lg"
              className="px-8 gradient-primary hover:shadow-elegant transition-smooth"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Course Outline
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </div>

          {/* Example prompts */}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-sm text-muted-foreground">Try:</span>
            {[
              "Python Programming Basics",
              "Digital Marketing Strategy", 
              "Data Science Fundamentals"
            ].map((example) => (
              <Button 
                key={example}
                variant="ghost" 
                size="sm"
                onClick={() => setPrompt(example)}
                className="text-xs hover:bg-muted/50 transition-smooth"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Course Outline Chat */}
      {showOutline && (
        <Card className="p-6 gradient-card border-border">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">SkillMint AI</h3>
                <p className="text-xs text-muted-foreground">Generating course outline...</p>
              </div>
            </div>
            
            <div className="bg-muted/20 rounded-lg p-4 min-h-[200px]">
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-primary animate-pulse" />
                  <span className="text-muted-foreground">AI is thinking...</span>
                </div>
              ) : (
                <TypingAnimation 
                  text={courseOutline}
                  speed={20}
                  className="whitespace-pre-wrap text-sm"
                  onComplete={() => setShowBuildButton(true)}
                />
              )}
            </div>

            {showBuildButton && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={handleBuildCourse}
                  disabled={buildingCourse}
                  size="lg"
                  className="gradient-primary hover:shadow-elegant transition-smooth"
                >
                  {buildingCourse ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Building Complete Course...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Build Complete Course
                    </div>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            icon: Zap,
            title: "Lightning Fast",
            description: "Generate complete courses with lessons, quizzes, and videos in seconds"
          },
          {
            icon: Target,
            title: "Structured Learning",
            description: "Each course includes progressive lessons with assessments and multimedia"
          },
          {
            icon: Users,
            title: "Personalized",
            description: "AI adapts content difficulty and style based on your learning goals"
          }
        ].map((feature) => (
          <Card key={feature.title} className="p-6 gradient-card border-border hover:shadow-card transition-smooth">
            <feature.icon className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Home;