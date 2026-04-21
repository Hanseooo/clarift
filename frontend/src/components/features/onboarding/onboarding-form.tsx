"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/actions/user";
import { Button } from "@/components/ui/button";

const EDUCATION_LEVELS = [
  "High School",
  "College Undergraduate",
  "College Graduate",
  "Postgraduate",
  "Other"
];

const OUTPUT_FORMATS = [
  "Bullet Points",
  "Paragraphs",
  "Q&A",
  "Flashcards",
  "Summaries"
];

const EXPLANATION_STYLES = [
  "Simple & Direct",
  "Detailed & Academic",
  "Analogy-based",
  "Socratic (Ask me questions)"
];

export function OnboardingForm({
  initialData,
}: {
  initialData?: {
    education_level?: string;
    output_formats?: string[];
    explanation_styles?: string[];
    custom_instructions?: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [educationLevel, setEducationLevel] = useState<string>(
    initialData?.education_level || ""
  );
  const [outputFormats, setOutputFormats] = useState<string[]>(
    initialData?.output_formats || []
  );
  const [explanationStyles, setExplanationStyles] = useState<string[]>(
    initialData?.explanation_styles || []
  );
  const [customInstructions, setCustomInstructions] = useState(
    initialData?.custom_instructions || ""
  );

  const handleFormatChange = (format: string) => {
    setOutputFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const handleStyleChange = (style: string) => {
    setExplanationStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = {
      education_level: educationLevel,
      output_formats: outputFormats,
      explanation_styles: explanationStyles,
      custom_instructions: customInstructions,
    };

    try {
      const result = await updateUserPreferences(data);

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Something went wrong.");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred while saving preferences.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto p-6 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div>
        <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Study Preferences</h2>
        {error && (
          <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
            {error}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Education Level
        </label>
        <select
          value={educationLevel}
          onChange={(e) => setEducationLevel(e.target.value)}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
        >
          <option value="" disabled>Select your level</option>
          {EDUCATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Preferred Output Formats
        </label>
        <div className="grid grid-cols-2 gap-2">
          {OUTPUT_FORMATS.map((format) => (
            <label key={format} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={outputFormats.includes(format)}
                onChange={() => handleFormatChange(format)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-zinc-700 dark:text-zinc-300">{format}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Explanation Styles
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXPLANATION_STYLES.map((style) => (
            <label key={style} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={explanationStyles.includes(style)}
                onChange={() => handleStyleChange(style)}
                className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-zinc-700 dark:text-zinc-300">{style}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Custom Instructions (Optional)
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="E.g., I have ADHD, please keep it extremely concise."
          className="w-full min-h-[100px] rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
