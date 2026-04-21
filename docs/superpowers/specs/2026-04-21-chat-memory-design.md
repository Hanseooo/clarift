# Chat Memory & UI Fading Design Spec

## Overview
This feature implements a stateless chat architecture with a bounded context window (memory) to optimize token usage and relevance. The UI visually indicates which messages fall outside this window, managing user expectations.

## Backend Integration
- The chat generation endpoint (e.g., `POST /api/chat`) remains stateless. It does not store conversation history in the database.
- It expects an array of messages (`messages: Message[]`) in the request payload.
- The frontend will restrict this payload to a maximum of 8 messages (the last 4 user/assistant turns) when making the API call.

## Frontend UI / UX
- **Message List Rendering:** The frontend maintains the full chat history in local state.
- **Fading Effect:** When iterating over the messages, the component calculates the distance from the most recent message. Messages at an index older than the last 8 will have the Tailwind classes `opacity-50 grayscale transition-all duration-300` applied. This visually distinguishes active context from historical archive.
- **Information Badge:** A subtle divider or fixed tooltip will be displayed, stating: *"To keep responses sharp, only the last 8 messages are used as context."* This ensures users understand why the AI might not remember a detail mentioned early in a long thread.
- **Loading State:** During processing, the UI MUST display a three-dot pulse animation with the text "Searching your notes..." (per `docs/dev/chat.md`).
