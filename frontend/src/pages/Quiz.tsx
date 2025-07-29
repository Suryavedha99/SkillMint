import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const Quiz = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchLessonQuiz = async () => {
      if (!courseId || !lessonId) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/courses/${courseId}/lessons/${lessonId}/quiz`
        );
        if (!res.ok) throw new Error("Failed to fetch quiz");
        const payload = await res.json();
        // expecting { id, title, questions: [{ id, question, options, correctAnswerIndex }] }
        setQuizData({
          ...payload,
          questions: payload.questions.map((q: any) => ({
            ...q,
            correctAnswer: q.correctAnswerIndex,
            correctAnswerText: q.answer // Add this line
          }))
        });
      } catch (err: any) {
        console.error("Quiz fetch error:", err);
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchLessonQuiz();
  }, [courseId, lessonId]);


  const { toast } = useToast();
  const [quizData, setQuizData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground">
        Loading quiz...
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-muted-foreground">
        No quiz available for this lesson.
      </div>
    );
  }


  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion]: value
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const submitQuiz = async () => {
    setQuizCompleted(true);
    setShowResults(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/progress/lesson`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: user?.id,
          course_id: courseId,
          lesson_id: lessonId
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save lesson progress");
      }
    } catch (err) {
      console.error("Progress API error:", err);
      toast({
        variant: "destructive",
        title: "Failed to track progress",
        description: "Could not update your course progress."
      });
    }
  };


  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
    setQuizCompleted(false);
  };

  const calculateScore = () => {
    let correct = 0;
    quizData.questions.forEach((question, index) => {
      const userAnswerIndex = parseInt(answers[index]);
      const userAnswerText = question.options[userAnswerIndex];
      if (
        userAnswerText &&
        userAnswerText.trim().toLowerCase() === question.correctAnswerText.trim().toLowerCase()
      ) {
        correct++;
      }
    });
    return correct;
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-destructive";
  };

  if (showResults) {
    const score = calculateScore();
    const total = quizData.questions.length;
    const percentage = Math.round((score / total) * 100);

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quiz Results</h1>
            <p className="text-muted-foreground">{quizData.title}</p>
          </div>
        </div>

        {/* Score Summary */}
        <Card className="p-8 text-center gradient-card border-border">
          <div className="space-y-4">
            <div className={`text-6xl font-bold ${getScoreColor(score, total)}`}>
              {percentage}%
            </div>
            <p className="text-xl">
              You scored <span className="font-semibold">{score}</span> out of <span className="font-semibold">{total}</span>
            </p>
            <Badge 
              variant="secondary" 
              className={`text-lg px-4 py-2 ${
                percentage >= 80 ? "bg-success/10 text-success border-success/20" :
                percentage >= 60 ? "bg-warning/10 text-warning border-warning/20" :
                "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {percentage >= 80 ? "Excellent!" : percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
            </Badge>
          </div>
        </Card>

        {/* Detailed Results */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Detailed Results</h2>
          {quizData.questions.map((question, index) => {
            const userAnswerIndex = parseInt(answers[index]);
            const userAnswerText = question.options[userAnswerIndex];
            const isUserCorrect =
              userAnswerText &&
              userAnswerText.trim().toLowerCase() === question.correctAnswerText.trim().toLowerCase();

            return (
              <Card key={question.id} className="p-6 gradient-card border-border">
                <div className="flex items-start gap-4">
                  {isUserCorrect ? (
                    <CheckCircle className="w-6 h-6 text-success mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-destructive mt-1" />
                  )}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                    <p className="text-muted-foreground">{question.question}</p>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isCorrectOption =
                          option.trim().toLowerCase() === question.correctAnswerText.trim().toLowerCase();
                        const isUserSelected = userAnswerIndex === optionIndex;

                        return (
                          <div
                            key={optionIndex}
                            className={`p-3 rounded-lg border flex items-center gap-2 ${
                              isCorrectOption
                                ? "bg-success/10 border-success/20 text-success"
                                : isUserSelected && !isCorrectOption
                                ? "bg-destructive/10 border-destructive/20 text-destructive"
                                : "bg-muted/20 border-border"
                            }`}
                          >
                            {isCorrectOption && <CheckCircle className="w-4 h-4" />}
                            {isUserSelected && !isCorrectOption && <XCircle className="w-4 h-4" />}
                            <span>{option}</span>
                            {isUserSelected && (
                              <span className="ml-2 text-xs italic">
                                (Your answer)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={restartQuiz} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake Quiz
          </Button>
          <Button onClick={() => navigate(-1)} className="gradient-primary">
            Continue Course
          </Button>
        </div>
      </div>
    );
  }

  const currentQ = quizData.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;
  const allAnswered = Object.keys(answers).length === quizData.questions.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Course
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{quizData.title}</h1>
          <p className="text-muted-foreground">
            Question {currentQuestion + 1} of {quizData.questions.length}
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-4 gradient-card border-border">
        <div className="flex justify-between text-sm mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-smooth" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Question */}
      <Card className="p-8 gradient-card border-border">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">{currentQ.question}</h2>
          
          <RadioGroup 
            value={answers[currentQuestion]?.toString() || ""} 
            onValueChange={handleAnswerChange}
            className="space-y-4"
          >
            {currentQ.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted/20 transition-smooth">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>
        
        <div className="flex gap-2">
          {quizData.questions.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestion 
                  ? "bg-primary" 
                  : answers[index] !== undefined
                  ? "bg-success"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentQuestion === quizData.questions.length - 1 ? (
          <Button 
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="gradient-primary"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button 
            onClick={nextQuestion}
            disabled={answers[currentQuestion] === undefined}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default Quiz;