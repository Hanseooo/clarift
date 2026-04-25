"use client";

import { useEffect, useState, useRef } from "react";

interface ScoreRevealProps {
  score: number;
  correctCount: number;
  totalCount: number;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function ScoreReveal({ score, correctCount, totalCount }: ScoreRevealProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const duration = 800;

  const tier = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  const tierConfig = {
    success: {
      color: "#10B981",
      bg: "rgba(16,185,129,0.1)",
      border: "rgba(16,185,129,0.3)",
      message: "Great work — keep it up",
    },
    warning: {
      color: "#F59E0B",
      bg: "rgba(245,158,11,0.1)",
      border: "rgba(245,158,11,0.3)",
      message: "Good progress — review weak areas",
    },
    danger: {
      color: "#EF4444",
      bg: "rgba(239,68,68,0.1)",
      border: "rgba(239,68,68,0.3)",
      message: "Keep going — practice makes perfect",
    },
  };

  const config = tierConfig[tier];

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (startTimeRef.current ?? 0);
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * score);

      setDisplayScore(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [score]);

  return (
    <div className="rounded-2xl border border-border-default overflow-hidden">
      {/* Top section - score display */}
      <div
        className="px-5 py-6 text-center border-b border-border-default"
        style={{
          background: `linear-gradient(135deg, ${config.bg} 0%, rgba(99,102,241,0.04) 100%)`,
        }}
      >
        <p className="text-sm text-text-secondary mb-2">Quiz Results</p>

        {/* Score ring */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-2.5 flex flex-col items-center justify-center"
          style={{
            background: config.bg,
            border: `2px solid ${config.border}`,
            boxShadow: isComplete ? `0 0 0 6px ${config.bg}` : "none",
            transition: "box-shadow 300ms ease",
          }}
        >
          <span
            className="text-[28px] font-bold leading-none"
            style={{ color: config.color }}
          >
            {displayScore}%
          </span>
          <span
            className="text-[10px] font-medium mt-0.5"
            style={{ color: config.color, opacity: 0.8 }}
          >
            score
          </span>
        </div>

        {/* Contextual message */}
        <p className="text-sm font-semibold text-text-primary">
          {config.message}
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          {correctCount} of {totalCount} correct
        </p>
      </div>
    </div>
  );
}
