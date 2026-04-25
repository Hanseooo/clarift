'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { summaries, users } from "@/db/schema";

export async function updateSummaryContent(
  summaryId: string,
  content: string,
) {
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
      .update(summaries)
      .set({ content })
      .where(and(
        eq(summaries.id, summaryId),
        eq(summaries.userId, user.id),
      ));

    revalidatePath(`/summaries/${summaryId}`);
    revalidatePath("/summaries");

    return { success: true };
  } catch (error) {
    console.error("Failed to update summary:", error);
    return { success: false, error: "Failed to update summary" };
  }
}

export async function updateSummaryTitle(summaryId: string, title: string) {
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
      .update(summaries)
      .set({ title: title.slice(0, 32) })
      .where(and(
        eq(summaries.id, summaryId),
        eq(summaries.userId, user.id),
      ));

    revalidatePath('/summaries');
    revalidatePath(`/summaries/${summaryId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to update summary title:", error);
    return { success: false, error: "Failed to update summary title" };
  }
}
