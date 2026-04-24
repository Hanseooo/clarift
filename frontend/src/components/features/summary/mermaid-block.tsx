'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidBlockProps {
  chart: string;
}

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  run: (options: { nodes: HTMLElement[] }) => Promise<void>;
}

interface MermaidModule {
  default: MermaidAPI;
}

let mermaidPromise: Promise<MermaidModule> | null = null;

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import(
      'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
    );
    const mermaid = await mermaidPromise;
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#E0E7FF',
        primaryTextColor: '#1A1833',
        primaryBorderColor: '#6366F1',
        lineColor: '#6B6888',
        secondaryColor: '#F1F0FE',
        tertiaryColor: '#F8F7FF',
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      securityLevel: 'strict',
    });
  }
  return mermaidPromise;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = await getMermaid();
        if (cancelled || !ref.current) return;

        const pre = document.createElement('pre');
        pre.className = 'mermaid';
        pre.textContent = chart;
        ref.current.innerHTML = '';
        ref.current.appendChild(pre);

        await mermaid.default.run({ nodes: [ref.current] });
      } catch (err) {
        if (!cancelled) setError(true);
      }
    }

    render();
    return () => {
      cancelled = true;
      if (ref.current) {
        ref.current.innerHTML = '';
      }
    };
  }, [chart]);

  if (error) {
    return (
      <div role="alert" className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">
        Could not render diagram.
      </div>
    );
  }

  return <div ref={ref} className="my-4" />;
}
