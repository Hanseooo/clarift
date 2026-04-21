import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { SettingsClient } from "./client";

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
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Global Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Update your global study preferences to tailor your learning experience.
        </p>
      </div>

      <SettingsClient preferences={preferences} />
    </div>
  );
}