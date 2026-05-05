"use client";

import { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type QuizTypeFlag = { applicable: boolean; reason: string };

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
  applicabilityFlags: Record<string, QuizTypeFlag> | null;
  loadingFlags?: boolean;
  onGenerate: (settings: QuizSettings | null) => void;
}

const typeLabels: Record<string, string> = {
  mcq: "Multiple Choice",
  true_false: "True / False",
  identification: "Identification",
  multi_select: "Multi-Select",
  ordering: "Ordering",
};

const typeColors: Record<string, { bg: string; text: string; border: string; badgeBg: string; badgeText: string }> = {
  mcq: {
    bg: "bg-brand-50 dark:bg-brand-950/20",
    text: "text-brand-800 dark:text-brand-200",
    border: "border-brand-200 dark:border-brand-800",
    badgeBg: "bg-brand-100 dark:bg-brand-900/40",
    badgeText: "text-brand-800 dark:text-brand-200",
  },
  true_false: {
    bg: "bg-[#F0FDF4] dark:bg-[#052E16]",
    text: "text-[#166534] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    badgeBg: "bg-[#F0FDF4] dark:bg-[#052E16]",
    badgeText: "text-[#166534] dark:text-[#4ADE80]",
  },
  identification: {
    bg: "bg-[#FFF7ED] dark:bg-[#431407]",
    text: "text-[#9A3412] dark:text-[#FB923C]",
    border: "border-[#FFEDD5] dark:border-[#9A3412]",
    badgeBg: "bg-[#FFF7ED] dark:bg-[#431407]",
    badgeText: "text-[#9A3412] dark:text-[#FB923C]",
  },
  multi_select: {
    bg: "bg-[#F5F3FF] dark:bg-[#1E0A3C]",
    text: "text-[#5B21B6] dark:text-[#A78BFA]",
    border: "border-[#EDE9FE] dark:border-[#5B21B6]",
    badgeBg: "bg-[#F5F3FF] dark:bg-[#1E0A3C]",
    badgeText: "text-[#5B21B6] dark:text-[#A78BFA]",
  },
  ordering: {
    bg: "bg-[#F0F9FF] dark:bg-[#082F49]",
    text: "text-[#0C4A6E] dark:text-[#38BDF8]",
    border: "border-[#E0F2FE] dark:border-[#0C4A6E]",
    badgeBg: "bg-[#F0F9FF] dark:bg-[#082F49]",
    badgeText: "text-[#0C4A6E] dark:text-[#38BDF8]",
  },
};

export function QuizSettingsPanel({ applicabilityFlags, loadingFlags = false, onGenerate }: QuizSettingsPanelProps) {
  const [autoMode, setAutoMode] = useState(true);
  const [overrides, setOverrides] = useState<QuizTypeSettings>({
    mcq: true,
    true_false: true,
    identification: true,
    multi_select: true,
    ordering: true,
  });

  const handleToggleType = (type: string) => {
    if (autoMode) return;
    const key = type as keyof QuizTypeSettings;
    setOverrides((prev) => ({
      ...prev,
      [key]: !prev[key],
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

  if (loadingFlags || !applicabilityFlags) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {loadingFlags ? "Analyzing document..." : "Loading quiz type analysis..."}
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
          <Switch
            checked={autoMode}
            onCheckedChange={() => setAutoMode(!autoMode)}
          />
        </div>
      </div>

      <div className="space-y-2">
        {(Object.keys(applicabilityFlags) as string[]).map((type) => {
          const flag = applicabilityFlags[type];
          const colors = typeColors[type];
          const isChecked = autoMode ? flag.applicable : overrides[type as keyof QuizTypeSettings];
          const isDisabled = autoMode || !flag.applicable;

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleToggleType(type)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 min-h-11 text-left transition-all ${
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

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
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
        className="w-full h-11"
        disabled={!hasAnySelected}
        onClick={handleGenerate}
      >
        Generate Quiz
      </Button>
    </div>
  );
}
