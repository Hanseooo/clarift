"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export function LoginButton() {
  const clerk = useClerk();

  const handleSignIn = () => {
    clerk.redirectToSignIn({
      redirectUrl: "/dashboard",
    });
  };

  return (
    <Button
      variant="default"
      size="lg"
      className="gap-2"
      onClick={handleSignIn}
    >
      <LogIn className="size-4" />
      Sign in with Google
    </Button>
  );
}