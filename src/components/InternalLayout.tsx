import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const InternalLayout = () => {
  const { user } = useAuth();
  
  // Get initials from user name
  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : '??';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 sticky top-0 z-40 shadow-sm">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
            <div className="flex items-center gap-3 pl-2 border-l border-border/50">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-foreground leading-none">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">{user?.role}</span>
              </div>
              <Avatar className="h-8 w-8 border-2 border-primary ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-black tracking-widest">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-4 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default InternalLayout;
