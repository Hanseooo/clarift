import { LoginButton } from "@/components/login-button";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo and title */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <BookOpen className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome to Clarift
          </h1>
          <p className="text-muted-foreground text-lg">
            Your AI-powered study engine for Filipino students
          </p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Sign in to start turning your study materials into effective learning with structured summaries, quizzes, and personalized practice.
          </p>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Sign in to continue
              </h2>
              <p className="text-muted-foreground text-sm">
                Use your Google account to access Clarift
              </p>
            </div>

            <div className="pt-4">
              <LoginButton />
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy.
                Your study data remains private and is never shared.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground pt-8">
          <p>Built for Filipino students preparing for board exams.</p>
          <p className="mt-1">Nursing • CPA • Engineering • Medicine</p>
        </div>
      </div>
    </div>
  );
}