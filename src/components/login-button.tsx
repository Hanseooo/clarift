"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/auth";
import { LogIn } from "lucide-react";

export function LoginButton() {
  const handleLogin = async () => {
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Failed to sign in with Google", error);
    }
  };

  return (
    <Button
      onClick={handleLogin}
      variant="default"
      size="lg"
      className="gap-2"
    >
      <LogIn className="size-4" />
      Sign in with Google
    </Button>
  );
}