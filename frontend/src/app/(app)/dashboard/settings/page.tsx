import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { SettingsClient } from "./client";
import { ThemeSettings } from "@/components/theme-settings";

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  if (!user) {
    redirect("/onboarding");
  }

  // Parse or cast the preferences if needed, or just pass it down if they match
  const preferences = user.userPreferences as {
    education_level?: string;
    output_formats?: string[];
    explanation_styles?: string[];
    custom_instructions?: string;
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          Global Settings
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Update your global study preferences to tailor your learning experience.
        </p>
      </div>

      <ThemeSettings />

      <div className="border-t border-border-default pt-8">
        <SettingsClient preferences={preferences} />
      </div>
    </div>
  );
}