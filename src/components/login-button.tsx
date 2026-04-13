"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export function LoginButton() {
  return (
      <SignInButton>
      <Button variant="default" size="lg" className="gap-2">
        <LogIn className="size-4" />
        Sign in with Google
      </Button>
    </SignInButton>
  );
}