export interface PreferenceOption {
  value: string;
  label: string;
  description: string;
}

export const OUTPUT_FORMAT_OPTIONS: PreferenceOption[] = [
  { value: "bullet_points", label: "Bullet Points", description: "Quick, scannable key concepts" },
  { value: "paragraphs", label: "Paragraphs", description: "Flowing prose with clear transitions" },
  { value: "q_and_a", label: "Q&A", description: "Question and answer format for active recall" },
  { value: "examples", label: "Examples", description: "Concrete examples that illustrate concepts" },
  { value: "tables", label: "Tables", description: "Structured comparisons and data" },
  { value: "step_by_step", label: "Step-by-Step", description: "Numbered procedures and processes" },
];

export const EXPLANATION_STYLE_OPTIONS: PreferenceOption[] = [
  { value: "simple_direct", label: "Simple & Direct", description: "Plain language, no fluff" },
  { value: "detailed_academic", label: "Detailed & Academic", description: "In-depth with technical terminology" },
  { value: "analogy_based", label: "Analogy-based", description: "Compare complex ideas to familiar things" },
  { value: "socratic", label: "Socratic", description: "Learn through guided questioning" },
  { value: "eli5", label: "ELI5", description: "Explain like I'm five — ultra simple" },
  { value: "mental_models", label: "Mental Models", description: "Frame concepts through useful mental models" },
];

export const EDUCATION_LEVEL_OPTIONS = [
  "High School",
  "College Undergraduate",
  "College Graduate",
  "Postgraduate",
  "Other",
];

export const CHAT_MODE_OPTIONS = [
  {
    value: "strict_rag" as const,
    title: "Strict Notes Only",
    description: "Answers come only from your uploaded material. No outside knowledge.",
    preview: "A: Based on your notes [1], photosynthesis occurs in chloroplasts.",
  },
  {
    value: "tutor" as const,
    title: "Tutor",
    description: "Uses your notes first, then adds context from general knowledge when helpful.",
    preview: "A: Your notes state X [1]. Beyond your notes, X also works by...",
  },
  {
    value: "socratic" as const,
    title: "Socratic",
    description: "Guides you to the answer with questions instead of giving it directly.",
    preview: "Q: What do your notes say happens first? Let's work through this...",
  },
];

export const CHAT_PERSONA_OPTIONS = [
  {
    value: "default" as const,
    title: "Default",
    description: "Clear, helpful, and adaptable to your needs.",
    preview: "A: Here's a clear explanation of the concept...",
  },
  {
    value: "encouraging" as const,
    title: "Encouraging",
    description: "Warm and supportive. Celebrates effort and breaks ideas into steps.",
    preview: "A: Great question! Let's break this down step by step...",
  },
  {
    value: "direct" as const,
    title: "Direct",
    description: "Concise and efficient. Gets straight to the point with minimal fluff.",
    preview: "A: • Point 1\n• Point 2\n• Point 3",
  },
  {
    value: "witty" as const,
    title: "Witty",
    description: "Clever and engaging. Uses light humor and memorable analogies.",
    preview: "A: Think of it like a traffic jam for electrons...",
  },
  {
    value: "patient" as const,
    title: "Patient",
    description: "Gentle and never rushed. Asks guiding questions before answering.",
    preview: "A: What do you think happens first? Let's explore together...",
  },
];
