import createClient from "openapi-fetch";
import type * as Schema from "./api-types";

type paths = Schema.paths;

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Helper functions for common operations
export function getClient() {
  return client;
}

export function createAuthenticatedClient(token: string) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function uploadDocument(file: File, token?: string) {
  const formData = new FormData();
  formData.append("file", file);
  const clientToUse = token ? createAuthenticatedClient(token) : client;
  const response = await clientToUse.POST("/api/v1/documents/upload", {
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
}