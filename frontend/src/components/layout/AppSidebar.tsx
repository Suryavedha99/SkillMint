import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Save, LogOut, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

const navigationItems = [
  { title: "Course Builder", url: "/", icon: Home },
  { title: "My Courses", url: "/saved", icon: Save },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const supabase = useSupabaseClient();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClass = (active: boolean) =>
    active
      ? "bg-primary/10 text-primary border-r-2 border-primary"
      : "hover:bg-muted/50 transition-smooth";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"}>
      <SidebarContent className="bg-sidebar border-r border-sidebar-border flex flex-col h-full">
        <div className="p-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">SkillMint</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={getNavClass(isActive(item.url))}
                    >
                      <item.icon className="w-4 h-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Section: Auth Info + Pro Tip */}
        {!isCollapsed && (
          <div className="mt-auto p-4 space-y-4">
            {/* User Info & Sign Out */}
            {user && (
              <div className="border border-sidebar-border rounded-lg p-4 text-xs space-y-2">
                <p className="text-muted-foreground">Signed in as:</p>
                <p className="font-medium text-sm text-sidebar-foreground truncate">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-xs text-destructive hover:underline"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}

            {/* Pro Tip */}
            <div className="bg-gradient-card rounded-lg p-4 border border-sidebar-border">
              <h3 className="text-sm font-medium text-sidebar-foreground mb-2">Pro Tip</h3>
              <p className="text-xs text-muted-foreground">
                Try specific topics like "Machine Learning for Beginners" for better results!
              </p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
