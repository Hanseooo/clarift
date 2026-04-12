import createClient from "openapi-fetch";

// Temporary empty paths type until backend schema is generated
export type paths = {};

export const client = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Helper functions for common operations
export function getClient() {
  return client;
}