"use server";

import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getDocuments() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return [];
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    return [];
  }

  const docs = await db.query.documents.findMany({
    where: eq(documents.userId, user.id),
    orderBy: [desc(documents.createdAt)],
  });

  return docs;
}

export async function deleteDocument(documentId: string) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  // TODO: Call backend endpoint to cascade delete pgvector embeddings to save space.

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)));

  revalidatePath("/documents");

  return { success: true };
}