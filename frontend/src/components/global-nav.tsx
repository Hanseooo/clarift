"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { MessageSquare, LayoutDashboard, BrainCircuit, GraduationCap, ScrollText } from "lucide-react";

export function GlobalNav() {
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();

  if (!isLoaded || !userId) return null;

  const routes = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Chat", path: "/chat", icon: MessageSquare },
    { name: "Summaries", path: "/summaries", icon: ScrollText },
    { name: "Quizzes", path: "/quizzes", icon: GraduationCap },
    { name: "Practice", path: "/practice", icon: BrainCircuit },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
              C
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">Clarift</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            {routes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname.startsWith(route.path);
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-secondary text-secondary-foreground" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {route.name}
                </Link>
              );
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </div>
    </nav>
  );
}
