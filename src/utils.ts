import { PATTERNS, type Annotation, type DocumentRecord, type PatternName, type WorkspaceExport } from './types';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

export function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function sampleAverageColor(context: CanvasRenderingContext2D, x: number, y: number, radius = 2): string {
  const startX = Math.max(0, Math.floor(x - radius));
  const startY = Math.max(0, Math.floor(y - radius));
  const width = Math.min(context.canvas.width - startX, radius * 2 + 1);
  const height = Math.min(context.canvas.height - startY, radius * 2 + 1);
  const pixels = context.getImageData(startX, startY, width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let alphaTotal = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    alphaTotal += alpha;
  }
  return alphaTotal ? rgbToHex(red / alphaTotal, green / alphaTotal, blue / alphaTotal) : '#FFFFFF';
}

export function readableDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export function isPattern(value: unknown): value is PatternName {
  return typeof value === 'string' && (PATTERNS as readonly string[]).includes(value);
}

export function validateWorkspace(value: unknown): value is WorkspaceExport {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WorkspaceExport>;
  const document = candidate.document;
  if (candidate.schema !== 'color-context.workspace' || candidate.version !== 1 || !document) return false;
  if (typeof document.name !== 'string' || typeof document.mime !== 'string' || typeof document.dataUrl !== 'string') return false;
  if (!SUPPORTED_TYPES.includes(document.mime) || !document.dataUrl.startsWith(`data:${document.mime};base64,`)) return false;
  if (!Array.isArray(document.annotations) || document.annotations.length > 5000) return false;
  return document.annotations.every((annotation) => {
    const item = annotation as Partial<Annotation>;
    return typeof item.id === 'string' && typeof item.label === 'string' && item.label.length <= 120 &&
      typeof item.x === 'number' && Number.isFinite(item.x) && item.x >= 0 &&
      typeof item.y === 'number' && Number.isFinite(item.y) && item.y >= 0 &&
      typeof item.page === 'number' && item.page >= 1 && typeof item.color === 'string' && isPattern(item.pattern);
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function makeRecord(file: File): DocumentRecord {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type,
    blob: file,
    annotations: [],
    page: 1,
    pageCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}
