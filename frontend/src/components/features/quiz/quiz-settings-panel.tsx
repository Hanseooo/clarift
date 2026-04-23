"use client";

import { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type QuizTypeFlags = {
  mcq: { applicable: true; reason: string };
  true_false: { applicable: boolean; reason: string };
  identification: { applicable: boolean; reason: string };
  multi_select: { applicable: boolean; reason: string };
  ordering: { applicable: boolean; reason: string };
};

type QuizTypeSettings = {
  mcq: boolean;
  true_false: boolean;
  identification: boolean;
  multi_select: boolean;
  ordering: boolean;
};

type QuizSettings = {
  auto_mode: boolean;
  type_overrides: QuizTypeSettings | null;
};

interface QuizSettingsPanelProps {
  applicabilityFlags: QuizTypeFlags | null;
  onGenerate: (settings: QuizSettings | null) => void;
}

const typeLabels: Record<keyof QuizTypeFlags, string> = {
  mcq: "Multiple Choice",
  true_false: "True / False",
  identification: "Identification",
  multi_select: "Multi-Select",
  ordering: "Ordering",
};

const typeColors: Record<keyof QuizTypeFlags, { bg: string; text: string; border: string; badgeBg: string; badgeText: string }> = {
  mcq: {
    bg: "bg-brand-50 dark:bg-brand-950/20",
    text: "text-brand-800 dark:text-brand-200",
    border: "border-brand-200 dark:border-brand-800",
    badgeBg: "bg-brand-100 dark:bg-brand-900/40",
    badgeText: "text-brand-800 dark:text-brand-200",
  },
  true_false: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-800 dark:text-emerald-200",
    border: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-800 dark:text-emerald-200",
  },
  identification: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-800 dark:text-orange-200",
    border: "border-orange-200 dark:border-orange-800",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-800 dark:text-orange-200",
  },
  multi_select: {
    bg: "bg-purple-50 dark:bg-purple-950/20",
    text: "text-purple-800 dark:text-purple-200",
    border: "border-purple-200 dark:border-purple-800",
    badgeBg: "bg-purple-100 dark:bg-purple-900/40",
    badgeText: "text-purple-800 dark:text-purple-200",
  },
  ordering: {
    bg: "bg-sky-50 dark:bg-sky-950/20",
    text: "text-sky-800 dark:text-sky-200",
    border: "border-sky-200 dark:border-sky-800",
    badgeBg: "bg-sky-100 dark:bg-sky-900/40",
    badgeText: "text-sky-800 dark:text-sky-200",
  },
};

export function QuizSettingsPanel({ applicabilityFlags, onGenerate }: QuizSettingsPanelProps) {
  const [autoMode, setAutoMode] = useState(true);
  const [overrides, setOverrides] = useState<QuizTypeSettings>({
    mcq: true,
    true_false: true,
    identification: true,
    multi_select: true,
    ordering: true,
  });

  const handleToggleType = (type: keyof QuizTypeFlags) => {
    if (autoMode) return;
    setOverrides((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleGenerate = () => {
    if (autoMode) {
      onGenerate({ auto_mode: true, type_overrides: null });
    } else {
      onGenerate({ auto_mode: false, type_overrides: overrides });
    }
  };

  const hasAnySelected = autoMode || Object.values(overrides).some(Boolean);

  if (!applicabilityFlags) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          Loading quiz type analysis...
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-foreground">Quiz Types</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs ${autoMode ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground"}`}>
            Auto
          </span>
          <button
            type="button"
            onClick={() => setAutoMode(!autoMode)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              autoMode ? "bg-brand-500" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                autoMode ? "translate-x-[18px]" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {(Object.keys(applicabilityFlags) as Array<keyof QuizTypeFlags>).map((type) => {
          const flag = applicabilityFlags[type];
          const colors = typeColors[type];
          const isChecked = autoMode ? flag.applicable : overrides[type];
          const isDisabled = autoMode || !flag.applicable;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleToggleType(type)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                isDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-border-strong hover:bg-surface-overlay"
              } ${
                isChecked && !isDisabled
                  ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/20"
                  : "border-border bg-background"
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded border transition-all ${
                  isChecked
                    ? "border-brand-500 bg-brand-500"
                    : "border-border bg-background"
                } ${isDisabled && !isChecked ? "opacity-40" : ""}`}
              >
                {isChecked ? (
                  <Check className="h-3 w-3 text-white" />
                ) : isDisabled ? (
                  <X className="h-3 w-3 text-muted-foreground" />
                ) : null}
              </div>

              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">
                  {typeLabels[type]}
                </span>
              </div>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  flag.applicable
                    ? `${colors.badgeBg} ${colors.badgeText}`
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {flag.applicable ? "Available" : "N/A"}
              </span>
            </button>
          );
        })}
      </div>

      {!autoMode && (
        <p className="text-xs text-muted-foreground">
          Toggle question types to include in your quiz.
        </p>
      )}

      <Button
        className="w-full"
        disabled={!hasAnySelected}
        onClick={handleGenerate}
      >
        Generate Quiz
      </Button>
    </div>
  );
}
