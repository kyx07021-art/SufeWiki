declare module '*?raw' { const value: string; export default value; }

interface Document {
  modelContext?: {
    registerTool(tool: {
      name: string; title: string; description: string; inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute(input: { query?: string; id?: string }): unknown;
    }, options: { signal: AbortSignal }): void;
  };
}
