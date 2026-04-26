"use server";

import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAuthenticatedClient } from "@/lib/api";

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
  const session = await auth();
  if (!session.userId) {
    throw new Error("Unauthorized");
  }

  const token = await session.getToken();
  if (!token) {
    throw new Error("Unauthorized");
  }

  const client = createAuthenticatedClient(token);
  const response = await client.DELETE("/api/v1/documents/{document_id}", {
    params: { path: { document_id: documentId } },
  });

  if (response.error) {
    throw new Error(response.error.detail || "Delete failed");
  }

  revalidatePath("/documents");
  return { success: true };
}
