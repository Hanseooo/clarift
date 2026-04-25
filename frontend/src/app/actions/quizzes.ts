'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { quizzes, users } from "@/db/schema";

export async function updateQuizTitle(quizId: string, title: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await db
      .update(quizzes)
      .set({ title: title.slice(0, 32) })
      .where(and(
        eq(quizzes.id, quizId),
        eq(quizzes.userId, user.id),
      ));

    revalidatePath('/quizzes');
    revalidatePath(`/quizzes/${quizId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update quiz title:", error);
    return { success: false, error: "Failed to update quiz title" };
  }
}
