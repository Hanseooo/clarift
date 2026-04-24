import { FileUp, Target, CheckSquare, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: FileUp,
    title: "Board exam prep in minutes, not hours",
    description:
      "Upload your notes and let AI extract what matters. No more re-reading 200-page chapters.",
  },
  {
    icon: Target,
    title: "Know exactly what to study",
    description:
      "We track your weak spots across quizzes so you never waste time on what you already know.",
  },
  {
    icon: CheckSquare,
    title: "Practice like it's the real exam",
    description:
      "MCQ, True/False, Identification — question types that match your actual board exam format.",
  },
  {
    icon: TrendingUp,
    title: "Track your progress daily",
    description:
      "See your accuracy improve over time. Celebrate milestones and stay motivated.",
  },
];

export function FeatureCards() {
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="max-w-[640px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-surface-card border border-border-default rounded-2xl p-5 hover:bg-surface-overlay hover:border-border-strong transition-colors duration-150 ease-in-out"
            >
              <div className="size-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                <feature.icon className="size-5 text-brand-400" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
