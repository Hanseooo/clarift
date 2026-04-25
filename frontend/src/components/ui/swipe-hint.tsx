"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const SWIPE_HINT_KEY = "swipe-hint-dismissed";

interface SwipeHintProps {
  message?: string;
}

export function SwipeHint({ message = "Swipe left on cards to delete" }: SwipeHintProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(SWIPE_HINT_KEY);
    if (!dismissed) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem(SWIPE_HINT_KEY, "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-surface-subtle text-text-secondary text-xs px-3 py-1.5 rounded-full shadow-sm border border-border-default"
      style={{ bottom: "calc(56px + env(safe-area-inset-bottom) + 8px)" }}
    >
      <span>{message}</span>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:text-text-primary transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
