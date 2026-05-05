"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OverridePreferences } from "@/types/preferences";
import {
  OUTPUT_FORMAT_OPTIONS,
  EXPLANATION_STYLE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
} from "@/lib/preference-options";

type OverrideSettingsModalProps = {
  initialPreferences?: OverridePreferences;
  onSave: (preferences: OverridePreferences) => Promise<void>;
  isSaving?: boolean;
  error?: string;
};

export function OverrideSettingsModal({
  initialPreferences,
  onSave,
  isSaving = false,
  error,
}: OverrideSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [educationLevel, setEducationLevel] = useState<string>(
    initialPreferences?.education_level || ""
  );
  const [outputFormats, setOutputFormats] = useState<string[]>(
    initialPreferences?.output_formats || []
  );
  const [explanationStyles, setExplanationStyles] = useState<string[]>(
    initialPreferences?.explanation_styles || []
  );
  const [customInstructions, setCustomInstructions] = useState(
    initialPreferences?.custom_instructions || ""
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

  const handleSave = async () => {
    setSaveError(null);
    try {
      await onSave({
        education_level: educationLevel || undefined,
        output_formats: outputFormats.length > 0 ? outputFormats : undefined,
        explanation_styles: explanationStyles.length > 0 ? explanationStyles : undefined,
        custom_instructions: customInstructions || undefined,
      });
      setOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to apply overrides. Please try again.");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSaveError(null);
      setEducationLevel(initialPreferences?.education_level || "");
      setOutputFormats(initialPreferences?.output_formats || []);
      setExplanationStyles(initialPreferences?.explanation_styles || []);
      setCustomInstructions(initialPreferences?.custom_instructions || "");
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Override Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Override Settings</DialogTitle>
          <DialogDescription>
            Customize preferences for this generation only. Your global preferences will remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {(error ?? saveError) && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive flex-1 min-w-0 break-words">{error ?? saveError}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="education-level" className="text-sm font-medium text-foreground">
              Education Level
            </label>
            <Select value={educationLevel} onValueChange={setEducationLevel}>
              <SelectTrigger id="education-level">
                <SelectValue placeholder="Select your level" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVEL_OPTIONS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Preferred Output Formats
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_FORMAT_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={outputFormats.includes(option.value)}
                  onChange={() => handleFormatChange(option.value)}
                  className="rounded border-border-default text-text-primary focus:ring-brand-500"
                />
                <span className="text-text-secondary min-w-0 break-words">{option.label}</span>
              </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Explanation Styles
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EXPLANATION_STYLE_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={explanationStyles.includes(option.value)}
                  onChange={() => handleStyleChange(option.value)}
                  className="rounded border-border-default text-text-primary focus:ring-brand-500"
                />
                <span className="text-text-secondary min-w-0 break-words">{option.label}</span>
              </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="custom-instructions" className="text-sm font-medium text-foreground">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="E.g., Keep it extremely concise."
              className="w-full min-h-[80px] rounded-md border border-border-default bg-surface-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Applying..." : "Apply Overrides"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
