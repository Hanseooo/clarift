"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

import { z } from "zod";

const chatSettingsSchema = z.object({
  mode: z.enum(["strict_rag", "tutor", "socratic"]),
  persona: z.enum(["default", "encouraging", "direct", "witty", "patient"]),
});

const preferencesSchema = z.object({
  education_level: z.string().optional(),
  output_formats: z.array(z.string()).optional(),
  explanation_styles: z.array(z.string()).optional(),
  custom_instructions: z.string().optional(),
  chat_settings: chatSettingsSchema.optional(),
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
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { id: true }
    });

    if (existingUser) {
      await db
        .update(users)
        .set({ userPreferences: parsed.data })
        .where(eq(users.clerkUserId, userId));
    } else {
      const clerkUser = await currentUser();
      if (!clerkUser) {
        return { success: false, error: "User not found in Clerk" };
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return { success: false, error: "User email not found" };
      }

      const userByEmail = await db.query.users.findFirst({
        where: eq(users.email, email),
        columns: { id: true }
      });

      if (userByEmail) {
        await db
          .update(users)
          .set({
            clerkUserId: userId,
            name: clerkUser.firstName || clerkUser.lastName ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() : null,
            image: clerkUser.imageUrl,
            userPreferences: parsed.data
          })
          .where(eq(users.email, email));
      } else {
        await db.insert(users).values({
          clerkUserId: userId,
          email,
          name: clerkUser.firstName || clerkUser.lastName ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() : null,
          image: clerkUser.imageUrl,
          userPreferences: parsed.data
        });
      }
    }

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return { success: false, error: "Failed to update user preferences" };
  }
}