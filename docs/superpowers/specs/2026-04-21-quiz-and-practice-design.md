# Quiz Generation & Targeted Practice Design Spec

## Overview
This feature implements the core interactive learning tools of the MVP: generating quizzes from documents, providing an engaging one-question-per-page attempt flow, detailed grading with AI explanations and mastery graphs, and a targeted practice loop that includes remedial lessons for weak areas.

## Quiz Attempt Flow (The "Taking" Experience)
- **UI Layout:** A "One Question Per Page" carousel wizard. 
- **Navigation:** Users click "Next" or "Previous" to navigate between questions. A progress bar (e.g., "Question 3 of 10") sits at the top.
- **Component Mapping:**
  - Multiple Choice: A list of options with A/B/C/D letter badges.
  - True/False: Two large, equally sized buttons.
  - Identification: A text input field.
  - Multi-select: A list of checkboxes.
  - Ordering: A draggable, sortable list component.
- **Submission:** On the final question, the "Next" button becomes a primary "Submit Quiz" button.

## Graded Results Page
- **Overview Header:** Displays the overall percentage score prominently.
- **Mastery Graph:** A visual representation (e.g., a Bar or Radar chart) breaking down the user's accuracy by subtopic for that specific quiz.
- **Detailed Review List:** A vertically scrolling list showing every question.
  - Displays the user's answer (styled green if correct, red if incorrect).
  - Displays the correct answer.
  - **AI Explanation:** A short, AI-generated explanation clarifying *why* the correct answer is right and the others are wrong.
- **Weak Area Trigger:** If any subtopic scores below 70%, an amber-colored "Targeted Practice" CTA appears.

## Targeted Practice Flow
- **Remedial Lesson (The "Before"):** Before diving straight into questions, the flow starts with a short "Mini-Lesson" screen. The AI generates a concise, targeted explanation of the weak topic to help the user actually *understand* the concept, not just memorize answers.
- **Drill Generation:** The backend retrieves the top 3 document chunks associated with the user's weakest topics and generates 5 practice drill questions.
- **Difficulty Progression:** The drills logically progress in difficulty from Level 1 (basic recall) to Level 3 (application/calculation).
- **Drill UI:** Uses the exact same "One Question Per Page" Carousel UI as the main quiz to maintain familiarity, followed by a similar Results page.
