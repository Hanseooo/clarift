export interface ChatSettings {
  mode: "strict_rag" | "tutor" | "socratic";
  persona: "default" | "encouraging" | "direct" | "witty" | "patient";
}

export interface OverridePreferences {
  education_level?: string;
  output_formats?: string[];
  explanation_styles?: string[];
  custom_instructions?: string;
  chat_settings?: ChatSettings;
}
