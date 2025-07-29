import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

const Auth = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // If already logged in, send them home
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement Supabase authentication
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    let authResponse;
    if (isLogin) {
      authResponse = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("Auth response:", authResponse);
    } else {
      authResponse = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
    }
 
    setIsLoading(false);
 
    if (authResponse.error) {
      return toast({
        title: "Authentication error",
        description: authResponse.error.message,
        variant: "destructive",
      });
    }
 
    // On successful login/signup, redirect to home
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-elegant">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SkillMint
            </span>
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "Sign in to continue your learning journey" : "Create your account and start building courses"}
          </p>
        </div>

        {/* Auth Form */}
        <Card className="p-8 gradient-card border-border shadow-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-background/50 border-border focus:border-primary transition-smooth"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-background/50 border-border focus:border-primary transition-smooth"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-background/50 border-border focus:border-primary transition-smooth"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-primary hover:shadow-elegant transition-smooth"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing In..." : "Creating Account..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Separator className="my-4" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </p>
              <Button
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="mt-2 text-primary hover:text-primary/80 transition-smooth"
              >
                {isLogin ? "Create an account" : "Sign in instead"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Features Preview */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Join thousands of learners who are building courses with AI</p>
          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <span>✨ AI-Powered Generation</span>
            <span>📚 Structured Learning</span>
            <span>🎯 Progress Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;