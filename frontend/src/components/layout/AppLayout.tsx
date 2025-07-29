import { useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const AppLayout = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Protect routes: redirect to auth if not signed in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You have been signed out." });
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">S</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                SkillMint
              </h1>
            </div>
          </div>
          
          <nav className="flex items-center gap-4">
            <NavLink
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Home
            </NavLink>
            <NavLink
              to="/course-builder"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Create Course
            </NavLink>
            <NavLink
              to="/saved"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Saved Courses
            </NavLink>
            {user ? (
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            ) : (
              <NavLink
                to="/auth"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Sign In
              </NavLink>
            )}
          </nav>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
