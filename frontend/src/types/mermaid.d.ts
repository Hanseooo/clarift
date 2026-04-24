declare module 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs' {
  const mermaid: {
    initialize: (config: Record<string, unknown>) => void;
    run: (options: { nodes: HTMLElement[] }) => Promise<void>;
  };
  export default mermaid;
}
