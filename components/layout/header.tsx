"use client";

import { Bell, LogOut, Search, Menu, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Section Titre - Responsive */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Section Droite - Responsive */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Bouton Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Avatar Utilisateur - Version Desktop */}
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-border">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {session?.user?.name || session?.user?.email?.split('@')[0] || "Utilisateur"}
              </span>
              <span className="text-xs text-muted-foreground -mt-0.5 truncate max-w-[150px]">
                {session?.user?.email || ""}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Version Mobile simplifiée */}
          <div className="flex lg:hidden items-center gap-2">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Menu Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 bg-background shadow-xl animate-in slide-in-from-right">
            {/* Header du menu mobile */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={session?.user?.image || ""} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {session?.user?.name || session?.user?.email?.split('@')[0] || "Utilisateur"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {session?.user?.email || ""}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  signOut({ callbackUrl: "/login" });
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}