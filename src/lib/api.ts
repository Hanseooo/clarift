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