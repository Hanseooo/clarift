# Onboarding & Global Settings Design Spec

## Overview
This feature implements the initial onboarding flow to capture global user settings (preferences) and the settings page to manage them later. These settings are applied loosely during AI generation.

## Data Storage
The `user_preferences` column in the `users` table will store a structured JSON object:
```json
{
  "education_level": "College",
  "output_formats": ["Bullet Points", "Paragraphs", "Tables", "Code Blocks"],
  "explanation_styles": ["Formal", "Simplified", "Mental Models", "Analogies", "Socratic"],
  "custom_instructions": "Always relate examples to nursing."
}
```

## Onboarding Flow (`/onboarding`)
1. User logs in via Clerk.
2. A Next.js middleware or layout checks if `user.has_completed_onboarding` (or if `user_preferences` is null).
3. If not completed, redirects to `/onboarding`.
4. A multi-step or single-page form collects:
   - Education Level (Single Select)
   - Output Format (Multi-Select Checkboxes)
   - Explanation Style (Multi-Select Checkboxes)
   - Custom Instructions (Textarea)
5. A Next.js Server Action saves the JSON to the database and redirects to `/dashboard`.

## Global Settings Page (`/settings`)
1. A page in the dashboard.
2. Renders the same fields from onboarding, populated with the user's existing preferences.
3. A Next.js Server Action updates the `user_preferences` column.

## AI Integration (Backend)
1. When generating a summary or quiz, the backend fetches `user_preferences`.
2. Appends a non-strict instruction to the LangChain system prompt:
   *"The user prefers [styles] and [formats] for a [level] audience. Apply these preferences where applicable, but do not force them if it compromises quality."*
