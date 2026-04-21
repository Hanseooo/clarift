# Per-generation Settings Override Design Spec

## Overview
This feature allows a user to temporarily bypass their global settings for a specific action (e.g., generating a summary or quiz). This ensures that while a user might prefer "College" level normally, they can generate a "High School" level summary for a specific document without permanently altering their global profile.

## UI Design
1. The document and quiz generation interfaces (where the main "Generate" action lives) will include a small "Override Settings" (or "Custom Settings") button.
2. Clicking this button opens a modal displaying the global settings fields:
   - Education Level
   - Output Format
   - Explanation Style
   - Custom Instructions
3. The modal is pre-populated with the user's current global `user_preferences`.
4. The user modifies these fields and saves the overrides for the pending action.

## Backend Integration
1. Backend generation endpoints (like `POST /api/summaries` or `POST /api/quizzes/generate`) will be updated to accept an optional `override_preferences` JSON object in the request body.
2. The logic in the service layer will be updated to prioritize this override.
   - Pseudocode: `preferences_to_use = request.override_preferences or db.get_user_preferences(user.id)`
3. The AI generation chain will incorporate these preferences into the system prompt exactly as it would for global settings.
