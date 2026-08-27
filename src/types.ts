export const PATTERNS = ['diagonal', 'crosshatch', 'dots', 'bars', 'checker', 'rings'] as const;

export type PatternName = (typeof PATTERNS)[number];

export interface Annotation {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  pattern: PatternName;
  page: number;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRecord {
  id: string;
  name: string;
  mime: string;
  blob: Blob;
  annotations: Annotation[];
  page: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceExport {
  schema: 'color-context.workspace';
  version: 1;
  exportedAt: string;
  document: {
    name: string;
    mime: string;
    dataUrl: string;
    annotations: Annotation[];
    page: number;
  };
}
