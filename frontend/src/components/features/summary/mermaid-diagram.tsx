"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  syntax: string;
  type?: string | null;
}

export function MermaidDiagram({ syntax }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!syntax || !containerRef.current) return;

    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = await import("mermaid");

        mermaid.default.initialize({
          startOnLoad: false,
          theme: "base",
          themeVariables: {
            primaryColor: "#E0E7FF",
            primaryTextColor: "#1A1833",
            primaryBorderColor: "#6366F1",
            lineColor: "#6B6888",
            secondaryColor: "#F1F0FE",
            tertiaryColor: "#F8F7FF",
          },
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: "basis",
          },
          securityLevel: "strict",
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.default.render(id, syntax.trim());

        if (!cancelled) {
          setSvg(renderedSvg);
          setHasError(false);
        }
      } catch (error) {
        console.error("Mermaid render error:", error);
        if (!cancelled) {
          setHasError(true);
          setSvg("");
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [syntax]);

  if (hasError || !svg) return null;

  return (
    <div className="bg-surface-subtle border border-border-default rounded-[10px] p-3.5 my-4 overflow-x-auto">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary mb-2.5">
        Visual overview
      </p>
      <div
        ref={containerRef}
        className="flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
