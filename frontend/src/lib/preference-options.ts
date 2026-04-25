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
