"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

import { z } from "zod";

const preferencesSchema = z.object({
  education_level: z.string().optional(),
  output_formats: z.array(z.string()).optional(),
  explanation_styles: z.array(z.string()).optional(),
  custom_instructions: z.string().optional()
}).strict();

export async function updateUserPreferences(preferences: unknown) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = preferencesSchema.safeParse(preferences);
  
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  try {
    await db
      .update(users)
      .set({ userPreferences: parsed.data })
      .where(eq(users.clerkUserId, userId));

    revalidatePath("/");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return { success: false, error: "Failed to update user preferences" };
  }
}