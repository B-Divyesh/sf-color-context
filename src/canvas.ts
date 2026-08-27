import type { Annotation, PatternName } from './types';

export interface DrawOptions {
  page: number;
  overlaysVisible: boolean;
  opacity: number;
  selectedId?: string;
  includeLabels?: boolean;
  keyboardCursor?: { x: number; y: number } | null;
}

function drawPattern(
  context: CanvasRenderingContext2D,
  pattern: PatternName,
  x: number,
  y: number,
  radius: number,
  opacity: number,
): void {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = `rgba(255, 253, 247, ${Math.min(0.94, opacity + 0.18)})`;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  context.strokeStyle = `rgba(12, 13, 17, ${opacity})`;
  context.fillStyle = `rgba(12, 13, 17, ${opacity})`;
  context.lineWidth = Math.max(2, radius / 12);
  const gap = Math.max(8, radius / 3.2);

  if (pattern === 'diagonal' || pattern === 'crosshatch') {
    for (let offset = -radius * 2; offset <= radius * 2; offset += gap) {
      context.beginPath();
      context.moveTo(x - radius + offset, y + radius);
      context.lineTo(x + radius + offset, y - radius);
      context.stroke();
    }
    if (pattern === 'crosshatch') {
      for (let offset = -radius * 2; offset <= radius * 2; offset += gap) {
        context.beginPath();
        context.moveTo(x - radius + offset, y - radius);
        context.lineTo(x + radius + offset, y + radius);
        context.stroke();
      }
    }
  } else if (pattern === 'dots') {
    for (let dotY = y - radius; dotY <= y + radius; dotY += gap) {
      for (let dotX = x - radius; dotX <= x + radius; dotX += gap) {
        context.beginPath();
        context.arc(dotX, dotY, Math.max(2, radius / 11), 0, Math.PI * 2);
        context.fill();
      }
    }
  } else if (pattern === 'bars') {
    for (let barY = y - radius; barY <= y + radius; barY += gap) {
      context.beginPath();
      context.moveTo(x - radius, barY);
      context.lineTo(x + radius, barY);
      context.stroke();
    }
  } else if (pattern === 'checker') {
    for (let row = -Math.ceil(radius / gap); row <= Math.ceil(radius / gap); row += 1) {
      for (let column = -Math.ceil(radius / gap); column <= Math.ceil(radius / gap); column += 1) {
        if ((row + column) % 2 === 0) context.fillRect(x + column * gap, y + row * gap, gap, gap);
      }
    }
  } else {
    for (let ring = gap / 2; ring < radius * 2; ring += gap) {
      context.beginPath();
      context.arc(x, y, ring, 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.restore();
}

export function drawComposite(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  annotations: Annotation[],
  options: DrawOptions,
): void {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.drawImage(source, 0, 0);
  if (!options.overlaysVisible) return;
  const visible = annotations.filter((annotation) => annotation.page === options.page);
  const radius = Math.max(24, Math.min(context.canvas.width, context.canvas.height) * 0.035);
  const fontSize = Math.max(16, Math.min(30, context.canvas.width / 55));

  visible.forEach((annotation, index) => {
    drawPattern(context, annotation.pattern, annotation.x, annotation.y, radius, options.opacity);
    context.save();
    context.lineWidth = annotation.id === options.selectedId ? Math.max(5, radius / 8) : Math.max(3, radius / 12);
    context.strokeStyle = annotation.id === options.selectedId ? '#C7F23A' : '#111218';
    context.beginPath();
    context.arc(annotation.x, annotation.y, radius, 0, Math.PI * 2);
    context.stroke();

    const badgeX = annotation.x - radius * 0.72;
    const badgeY = annotation.y - radius * 0.72;
    context.fillStyle = '#111218';
    context.beginPath();
    context.arc(badgeX, badgeY, radius * 0.38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#FDF9EE';
    context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(index + 1), badgeX, badgeY + 1);

    if (options.includeLabels) {
      const label = annotation.label.length > 34 ? `${annotation.label.slice(0, 33)}…` : annotation.label;
      context.font = `700 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      const width = Math.min(context.measureText(label).width + fontSize * 1.2, context.canvas.width * 0.55);
      const left = Math.min(annotation.x + radius * 0.72, context.canvas.width - width - 4);
      const top = Math.min(annotation.y + radius * 0.7, context.canvas.height - fontSize * 2.1);
      context.fillStyle = '#111218';
      context.fillRect(left, top, width, fontSize * 1.75);
      context.fillStyle = '#FDF9EE';
      context.textAlign = 'left';
      context.fillText(label, left + fontSize * 0.55, top + fontSize * 0.9);
    }
    context.restore();
  });

  if (options.keyboardCursor) {
    const { x, y } = options.keyboardCursor;
    context.save();
    context.strokeStyle = '#C7F23A';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x - radius, y);
    context.lineTo(x + radius, y);
    context.moveTo(x, y - radius);
    context.lineTo(x, y + radius);
    context.stroke();
    context.restore();
  }
}

export function hitTestAnnotation(annotations: Annotation[], page: number, x: number, y: number, radius: number): Annotation | undefined {
  return [...annotations].reverse().find((annotation) => annotation.page === page && Math.hypot(annotation.x - x, annotation.y - y) <= radius);
}
