import { drawComposite, hitTestAnnotation } from './canvas';
import { deleteDocument, listDocuments, saveDocument } from './db';
import { PATTERNS, type Annotation, type DocumentRecord, type PatternName, type WorkspaceExport } from './types';
import {
  MAX_FILE_BYTES,
  SUPPORTED_TYPES,
  blobToDataUrl,
  dataUrlToBlob,
  downloadBlob,
  makeRecord,
  readableDate,
  sampleAverageColor,
  validateWorkspace,
} from './utils';

interface PDFPageLike {
  getViewport(options: { scale: number }): { width: number; height: number };
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number }; canvas: HTMLCanvasElement }): { promise: Promise<void> };
}

interface PDFDocumentLike {
  numPages: number;
  getPage(page: number): Promise<PDFPageLike>;
  destroy(): Promise<void>;
}

interface DraftAnnotation {
  x: number;
  y: number;
  color: string;
  pattern: PatternName;
  editingId?: string;
}

interface ToastState {
  message: string;
  action?: string;
  actionLabel?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character);
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-|-$/g, '') || 'annotated';
}

function patternLabel(pattern: PatternName): string {
  return ({ diagonal: 'Diagonal', crosshatch: 'Crosshatch', dots: 'Dots', bars: 'Bars', checker: 'Checker', rings: 'Rings' })[pattern];
}

export class ColorContextApp {
  private root: HTMLElement;
  private documents: DocumentRecord[] = [];
  private current: DocumentRecord | null = null;
  private baseCanvas = document.createElement('canvas');
  private pdfDocument: PDFDocumentLike | null = null;
  private overlaysVisible = true;
  private overlayOpacity = 0.78;
  private zoom = 1;
  private mode: 'inspect' | 'mark' = 'inspect';
  private selectedId: string | undefined;
  private draft: DraftAnnotation | null = null;
  private keyboardCursor: { x: number; y: number } | null = null;
  private busy = false;
  private error = '';
  private toast: ToastState | null = null;
  private undoAnnotation: Annotation | null = null;
  private toastTimer: number | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.addEventListener('click', (event) => void this.handleClick(event));
    this.root.addEventListener('change', (event) => void this.handleChange(event));
    this.root.addEventListener('submit', (event) => void this.handleSubmit(event));
    this.root.addEventListener('pointerdown', (event) => this.handleCanvasPointer(event));
    this.root.addEventListener('keydown', (event) => void this.handleLocalKeydown(event));
    window.addEventListener('keydown', (event) => this.handleShortcut(event));
    window.addEventListener('online', () => { this.showToast('Back online. Your local workspace stayed available.'); this.render(); });
    window.addEventListener('offline', () => { this.showToast('Offline. You can keep working; changes stay on this device.'); this.render(); });
    window.addEventListener('color-context-update', () => this.showToast('A fresh version is ready.', 'reload', 'Update now'));
  }

  async start(): Promise<void> {
    this.applyTheme(localStorage.getItem('color-context-theme') ?? 'system');
    try {
      this.documents = await listDocuments();
    } catch {
      this.error = 'Local storage is unavailable. You can still annotate and export this session.';
    }
    this.render();
  }

  private applyTheme(theme: string): void {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('color-context-theme', theme);
  }

  private render(): void {
    const theme = document.documentElement.dataset.theme ?? 'system';
    this.root.innerHTML = `
      <header class="app-header">
        <a class="brand" href="#main-content" aria-label="Color Context home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span><h1>Color Context</h1><small>Name what color alone cannot tell you.</small></span>
        </a>
        <div class="header-actions">
          <button class="button button-primary" type="button" data-action="open"><span aria-hidden="true">＋</span> Open a file</button>
          <button class="icon-button" type="button" data-action="theme" aria-label="Change color theme" title="Theme: ${escapeHtml(theme)}">◐</button>
        </div>
        <input class="visually-hidden" id="file-open" type="file" aria-label="Choose an image or PDF" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" />
        <input class="visually-hidden" id="workspace-import" type="file" aria-label="Choose a Color Context workspace" accept="application/json,.json" />
      </header>
      ${!navigator.onLine ? '<div class="network-banner" role="status"><span aria-hidden="true">↯</span> Offline — the workbench and saved files remain available.</div>' : ''}
      <main id="main-content" tabindex="-1">
        ${this.error ? `<div class="error-banner" role="alert"><strong>Something needs attention.</strong> ${escapeHtml(this.error)} <button type="button" data-action="dismiss-error">Dismiss</button></div>` : ''}
        ${this.current ? this.workspaceTemplate() : this.emptyTemplate()}
      </main>
      <footer>
        <p>Private by design: files and labels stay in this browser unless you export them.</p>
        <nav aria-label="Legal and product information"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><span>Original generated artwork · no tracking</span></nav>
      </footer>
      <div class="sr-status" aria-live="polite" aria-atomic="true">${this.busy ? 'Loading document' : ''}</div>
      ${this.toastTemplate()}
    `;
    if (this.current && !this.busy && this.baseCanvas.width) this.drawVisibleCanvas();
    if (this.draft) requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#annotation-label')?.focus());
  }

  private emptyTemplate(): string {
    const recents = this.documents.length
      ? `<section class="recent-section" aria-labelledby="recent-title"><div class="section-heading"><p class="eyebrow">Local ledger</p><h2 id="recent-title">On this device</h2></div><ul class="recent-list">${this.documents.map((item) => `
          <li><button type="button" data-open-id="${item.id}"><span class="file-glyph" aria-hidden="true">${item.mime === 'application/pdf' ? 'PDF' : 'IMG'}</span><span><strong>${escapeHtml(item.name)}</strong><small>${item.annotations.length} ${item.annotations.length === 1 ? 'label' : 'labels'} · ${escapeHtml(readableDate(item.updatedAt))}</small></span><span aria-hidden="true">→</span></button></li>`).join('')}</ul></section>`
      : '';
    return `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="eyebrow">A private annotation workbench</p>
          <h2 id="hero-title">Turn a color cue into something you can name.</h2>
          <p class="hero-lede">Open a chart, status screenshot, or PDF. Sample the confusing cue, add your own meaning, and give it a high-contrast texture.</p>
          <div class="hero-actions">
            <button class="button button-primary button-large" type="button" data-action="open">Open an image or PDF</button>
            <button class="button button-quiet button-large" type="button" data-action="import">Import workspace</button>
          </div>
          <p class="privacy-note"><span aria-hidden="true">⌁</span> Your file never leaves this device.</p>
        </div>
        <picture class="hero-art">
          <source media="(max-width: 720px)" srcset="/assets/color-garden-720.avif" type="image/avif" />
          <source srcset="/assets/color-garden-1200.avif" type="image/avif" />
          <source media="(max-width: 720px)" srcset="/assets/color-garden-720.webp" type="image/webp" />
          <source srcset="/assets/color-garden-1200.webp" type="image/webp" />
          <img src="/assets/color-garden-1200.jpg" width="1200" height="800" alt="A surreal paper landscape of chart shapes with an eye-shaped opening filled with black-and-ivory textures." decoding="async" fetchpriority="high" />
          <span aria-hidden="true">Color is the terrain.<br />Meaning is the map.</span>
        </picture>
      </section>
      <section class="how-it-works" aria-labelledby="how-title">
        <div class="section-heading"><p class="eyebrow">Three moves</p><h2 id="how-title">Keep the original. Add context.</h2></div>
        <ol>
          <li><span>01</span><h3>Open</h3><p>Use a PNG, JPEG, WebP, GIF, or PDF up to 50 MB.</p></li>
          <li><span>02</span><h3>Mark + name</h3><p>Sample a cue, then attach a label and a distinct texture.</p></li>
          <li><span>03</span><h3>Export</h3><p>Save an annotated PNG or a restorable local workspace.</p></li>
        </ol>
        <p class="honesty-note"><strong>Important:</strong> an overlay can make cues distinguishable, but it cannot recover meaning that the source never provides.</p>
      </section>
      ${recents}
    `;
  }

  private workspaceTemplate(): string {
    const record = this.current;
    if (!record) return '';
    const visible = record.annotations.filter((annotation) => annotation.page === record.page);
    const modeHint = this.mode === 'mark'
      ? 'Click or tap a cue. Keyboard: focus the image, move the crosshair with arrow keys, then press Enter.'
      : visible.length ? 'Select a numbered mark on the image or in the label ledger.' : 'Choose “Mark a cue,” then select a point in the document.';
    return `
      <section class="workspace" aria-label="Annotation workspace">
        <aside class="tool-rail" aria-label="Document tools">
          <button class="tool ${this.mode === 'mark' ? 'is-active' : ''}" type="button" data-action="mark" aria-pressed="${this.mode === 'mark'}"><span aria-hidden="true">⌖</span><b>Mark a cue</b><kbd>M</kbd></button>
          <button class="tool" type="button" data-action="toggle-overlays" aria-pressed="${!this.overlaysVisible}"><span aria-hidden="true">${this.overlaysVisible ? '◉' : '◌'}</span><b>${this.overlaysVisible ? 'Hide overlays' : 'Show overlays'}</b></button>
          <div class="zoom-group" aria-label="Zoom controls"><button type="button" data-action="zoom-out" aria-label="Zoom out">−</button><output aria-live="polite">${Math.round(this.zoom * 100)}%</output><button type="button" data-action="zoom-in" aria-label="Zoom in">＋</button></div>
          <label class="opacity-control">Texture strength <input id="overlay-opacity" type="range" min="25" max="100" value="${Math.round(this.overlayOpacity * 100)}" /></label>
          <span class="tool-rule" aria-hidden="true"></span>
          <button class="tool" type="button" data-action="export-png"><span aria-hidden="true">⇩</span><b>Export PNG</b></button>
          <button class="tool" type="button" data-action="export-json"><span aria-hidden="true">↧</span><b>Export workspace</b></button>
          <button class="tool" type="button" data-action="import"><span aria-hidden="true">↥</span><b>Import workspace</b></button>
          <button class="tool danger-tool" type="button" data-action="delete-document"><span aria-hidden="true">×</span><b>Remove file</b></button>
        </aside>
        <section class="document-area" aria-labelledby="document-title">
          <div class="document-heading">
            <div><p class="eyebrow">Local document</p><h2 id="document-title">${escapeHtml(record.name)}</h2></div>
            ${record.mime === 'application/pdf' ? `<nav class="page-nav" aria-label="PDF pages"><button type="button" data-action="previous-page" ${record.page <= 1 ? 'disabled' : ''} aria-label="Previous page">←</button><span>Page ${record.page} of ${record.pageCount}</span><button type="button" data-action="next-page" ${record.page >= record.pageCount ? 'disabled' : ''} aria-label="Next page">→</button></nav>` : ''}
          </div>
          <div class="canvas-viewport ${this.mode === 'mark' ? 'is-marking' : ''}" data-canvas-viewport>
            ${this.busy ? '<div class="loading-state" role="status"><span aria-hidden="true"></span><strong>Preparing your document…</strong><small>Large PDFs can take a moment.</small></div>' : `<div class="canvas-sheet" style="width:${Math.round(this.zoom * 100)}%"><canvas id="document-canvas" tabindex="0" role="img" aria-label="${escapeHtml(record.name)}, page ${record.page}, with ${visible.length} saved ${visible.length === 1 ? 'annotation' : 'annotations'}"></canvas></div>`}
          </div>
          <p class="mode-hint" id="canvas-help"><span aria-hidden="true">${this.mode === 'mark' ? '⌖' : 'i'}</span>${modeHint}</p>
        </section>
        <aside class="ledger" aria-labelledby="ledger-title">
          <div class="ledger-heading"><div><p class="eyebrow">Meaning ledger</p><h2 id="ledger-title">Labels <span>${visible.length}</span></h2></div><button class="compact-open" type="button" data-action="open">New file</button></div>
          ${this.draft ? this.annotationFormTemplate() : this.annotationListTemplate(visible)}
          <div class="source-note"><span aria-hidden="true">≠</span><p><strong>Texture adds a clue, not a diagnosis.</strong> Check the source or its author when the intended meaning is unknown.</p></div>
        </aside>
      </section>
    `;
  }

  private annotationFormTemplate(): string {
    if (!this.draft) return '';
    const existing = this.draft.editingId ? this.current?.annotations.find((item) => item.id === this.draft?.editingId) : undefined;
    return `<form class="annotation-form" id="annotation-form">
      <div class="sample-heading"><span class="color-sample" style="--sample:${this.draft.color}"></span><div><p>${existing ? 'Edit label' : 'Sampled color'}</p><code>${this.draft.color}</code></div></div>
      <label for="annotation-label">What does this cue mean?</label>
      <input id="annotation-label" name="label" maxlength="120" required autocomplete="off" value="${escapeHtml(existing?.label ?? '')}" placeholder="e.g. Warning, Q3 series" aria-describedby="label-help" />
      <small id="label-help">Use the wording that will help you recognize it later.</small>
      <fieldset><legend>Texture</legend><div class="pattern-picker">${PATTERNS.map((pattern) => `<label title="${patternLabel(pattern)}"><input type="radio" name="pattern" value="${pattern}" ${this.draft?.pattern === pattern ? 'checked' : ''} /><span class="pattern pattern-${pattern}" aria-hidden="true"></span><b>${patternLabel(pattern)}</b></label>`).join('')}</div></fieldset>
      <div class="form-actions"><button class="button button-primary" type="submit">${existing ? 'Save changes' : 'Save label'}</button><button class="button button-quiet" type="button" data-action="cancel-draft">Cancel</button></div>
    </form>`;
  }

  private annotationListTemplate(annotations: Annotation[]): string {
    if (!annotations.length) return `<div class="ledger-empty"><span class="empty-target" aria-hidden="true">⌖</span><h3>No labels on this page</h3><p>Mark a cue that depends on color, then name what it means to you.</p><button class="button button-primary" type="button" data-action="mark">Mark the first cue</button></div>`;
    return `<ol class="annotation-list">${annotations.map((annotation, index) => `<li class="${annotation.id === this.selectedId ? 'is-selected' : ''}">
      <button class="annotation-main" type="button" data-select-id="${annotation.id}" aria-pressed="${annotation.id === this.selectedId}">
        <span class="annotation-number">${index + 1}</span><span class="pattern pattern-${annotation.pattern}" aria-hidden="true"></span><span class="annotation-copy"><strong>${escapeHtml(annotation.label)}</strong><code>${annotation.color}</code></span>
      </button>
      <div class="annotation-actions"><button type="button" data-edit-id="${annotation.id}">Edit</button><button type="button" data-delete-id="${annotation.id}">Delete</button></div>
    </li>`).join('')}</ol>`;
  }

  private toastTemplate(): string {
    if (!this.toast) return '';
    return `<div class="toast" role="status"><span>${escapeHtml(this.toast.message)}</span>${this.toast.action ? `<button type="button" data-action="${this.toast.action}">${escapeHtml(this.toast.actionLabel ?? 'Undo')}</button>` : ''}<button class="toast-close" type="button" data-action="dismiss-toast" aria-label="Dismiss notification">×</button></div>`;
  }

  private drawVisibleCanvas(includeLabels = false, target?: HTMLCanvasElement): void {
    const canvas = target ?? document.querySelector<HTMLCanvasElement>('#document-canvas');
    if (!canvas || !this.current || !this.baseCanvas.width) return;
    canvas.width = this.baseCanvas.width;
    canvas.height = this.baseCanvas.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    drawComposite(context, this.baseCanvas, this.current.annotations, {
      page: this.current.page,
      overlaysVisible: this.overlaysVisible,
      opacity: this.overlayOpacity,
      selectedId: this.selectedId,
      includeLabels,
      keyboardCursor: this.mode === 'mark' ? this.keyboardCursor : null,
    });
  }

  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button');
    if (!button) return;
    const openId = button.dataset.openId;
    const selectId = button.dataset.selectId;
    const editId = button.dataset.editId;
    const deleteId = button.dataset.deleteId;
    if (openId) {
      const record = this.documents.find((item) => item.id === openId);
      if (record) await this.loadRecord(record);
      return;
    }
    if (selectId) {
      this.selectedId = selectId;
      this.mode = 'inspect';
      this.render();
      return;
    }
    if (editId) {
      const annotation = this.current?.annotations.find((item) => item.id === editId);
      if (annotation) {
        this.selectedId = editId;
        this.draft = { x: annotation.x, y: annotation.y, color: annotation.color, pattern: annotation.pattern, editingId: editId };
        this.render();
      }
      return;
    }
    if (deleteId) {
      await this.removeAnnotation(deleteId);
      return;
    }
    const action = button.dataset.action;
    if (!action) return;
    if (action === 'open') document.querySelector<HTMLInputElement>('#file-open')?.click();
    else if (action === 'import') document.querySelector<HTMLInputElement>('#workspace-import')?.click();
    else if (action === 'theme') this.cycleTheme();
    else if (action === 'dismiss-error') { this.error = ''; this.render(); }
    else if (action === 'mark') this.startMarking();
    else if (action === 'toggle-overlays') { this.overlaysVisible = !this.overlaysVisible; this.render(); }
    else if (action === 'zoom-in') { this.zoom = Math.min(3, this.zoom + 0.25); this.render(); }
    else if (action === 'zoom-out') { this.zoom = Math.max(0.5, this.zoom - 0.25); this.render(); }
    else if (action === 'previous-page') await this.changePage(-1);
    else if (action === 'next-page') await this.changePage(1);
    else if (action === 'cancel-draft') { this.draft = null; this.render(); }
    else if (action === 'export-png') await this.exportPng();
    else if (action === 'export-json') await this.exportWorkspace();
    else if (action === 'delete-document') await this.removeCurrentDocument();
    else if (action === 'undo') await this.undoDelete();
    else if (action === 'reload') window.location.reload();
    else if (action === 'dismiss-toast') { this.toast = null; this.render(); }
  }

  private async handleChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.id === 'file-open' && input.files?.[0]) await this.openFile(input.files[0]);
    else if (input.id === 'workspace-import' && input.files?.[0]) await this.importWorkspace(input.files[0]);
    else if (input.id === 'overlay-opacity') {
      this.overlayOpacity = Number(input.value) / 100;
      this.drawVisibleCanvas();
    } else if (input.name === 'pattern' && this.draft) {
      this.draft.pattern = input.value as PatternName;
    }
    input.value = input.type === 'file' ? '' : input.value;
  }

  private async handleSubmit(event: SubmitEvent): Promise<void> {
    const form = event.target as HTMLFormElement;
    if (form.id !== 'annotation-form' || !this.draft || !this.current) return;
    event.preventDefault();
    const values = new FormData(form);
    const label = String(values.get('label') ?? '').trim();
    const pattern = String(values.get('pattern') ?? this.draft.pattern) as PatternName;
    if (!label || !PATTERNS.includes(pattern)) return;
    const now = Date.now();
    if (this.draft.editingId) {
      const annotation = this.current.annotations.find((item) => item.id === this.draft?.editingId);
      if (annotation) Object.assign(annotation, { label, pattern, updatedAt: now });
    } else {
      const annotation: Annotation = { id: crypto.randomUUID(), x: this.draft.x, y: this.draft.y, color: this.draft.color, label, pattern, page: this.current.page, createdAt: now, updatedAt: now };
      this.current.annotations.push(annotation);
      this.selectedId = annotation.id;
    }
    this.current.updatedAt = now;
    this.draft = null;
    this.mode = 'inspect';
    await this.persistCurrent('Label saved locally.');
  }

  private handleCanvasPointer(event: PointerEvent): void {
    const canvas = (event.target as HTMLElement).closest<HTMLCanvasElement>('#document-canvas');
    if (!canvas || !this.current || this.busy) return;
    const point = this.canvasPoint(canvas, event.clientX, event.clientY);
    if (this.mode === 'mark') {
      this.createDraft(point.x, point.y);
    } else {
      const radius = Math.max(24, Math.min(canvas.width, canvas.height) * 0.05);
      const hit = hitTestAnnotation(this.current.annotations, this.current.page, point.x, point.y, radius);
      if (hit) { this.selectedId = hit.id; this.render(); }
    }
  }

  private async handleLocalKeydown(event: KeyboardEvent): Promise<void> {
    const canvas = (event.target as HTMLElement).closest<HTMLCanvasElement>('#document-canvas');
    if (!canvas || !this.current) return;
    const step = event.shiftKey ? 10 : 1;
    if (this.mode === 'mark') {
      if (!this.keyboardCursor) this.keyboardCursor = { x: this.baseCanvas.width / 2, y: this.baseCanvas.height / 2 };
      if (event.key === 'ArrowLeft') this.keyboardCursor.x -= step;
      else if (event.key === 'ArrowRight') this.keyboardCursor.x += step;
      else if (event.key === 'ArrowUp') this.keyboardCursor.y -= step;
      else if (event.key === 'ArrowDown') this.keyboardCursor.y += step;
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.createDraft(this.keyboardCursor.x, this.keyboardCursor.y);
        return;
      } else if (event.key === 'Escape') {
        this.mode = 'inspect'; this.keyboardCursor = null; this.render(); return;
      } else return;
      event.preventDefault();
      this.keyboardCursor.x = Math.max(0, Math.min(this.baseCanvas.width, this.keyboardCursor.x));
      this.keyboardCursor.y = Math.max(0, Math.min(this.baseCanvas.height, this.keyboardCursor.y));
      this.drawVisibleCanvas();
    } else if (this.selectedId && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      const annotation = this.current.annotations.find((item) => item.id === this.selectedId);
      if (!annotation) return;
      event.preventDefault();
      annotation.x = Math.max(0, Math.min(this.baseCanvas.width, annotation.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)));
      annotation.y = Math.max(0, Math.min(this.baseCanvas.height, annotation.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0)));
      annotation.updatedAt = Date.now();
      this.drawVisibleCanvas();
      await this.persistCurrent();
    } else if (this.selectedId && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      await this.removeAnnotation(this.selectedId);
    }
  }

  private handleShortcut(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.matches('input, textarea, select') || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      document.querySelector<HTMLInputElement>('#file-open')?.click();
    } else if (event.key.toLowerCase() === 'm' && this.current) {
      event.preventDefault();
      this.startMarking();
    }
  }

  private canvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return { x: (clientX - bounds.left) * canvas.width / bounds.width, y: (clientY - bounds.top) * canvas.height / bounds.height };
  }

  private createDraft(x: number, y: number): void {
    const context = this.baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const visibleCount = this.current?.annotations.filter((item) => item.page === this.current?.page).length ?? 0;
    this.draft = { x, y, color: sampleAverageColor(context, x, y), pattern: PATTERNS[visibleCount % PATTERNS.length] };
    this.keyboardCursor = null;
    this.render();
  }

  private startMarking(): void {
    if (!this.current) return;
    this.mode = this.mode === 'mark' ? 'inspect' : 'mark';
    this.draft = null;
    this.keyboardCursor = this.mode === 'mark' ? { x: this.baseCanvas.width / 2, y: this.baseCanvas.height / 2 } : null;
    this.render();
    if (this.mode === 'mark') requestAnimationFrame(() => document.querySelector<HTMLCanvasElement>('#document-canvas')?.focus());
  }

  private async openFile(file: File): Promise<void> {
    this.error = '';
    if (file.size > MAX_FILE_BYTES) {
      this.error = 'That file is larger than 50 MB. Choose a smaller image or PDF.';
      this.render();
      return;
    }
    let normalized = file;
    if (!file.type && file.name.toLowerCase().endsWith('.pdf')) normalized = new File([file], file.name, { type: 'application/pdf' });
    if (!SUPPORTED_TYPES.includes(normalized.type)) {
      this.error = 'This format is not supported. Use PNG, JPEG, WebP, GIF, or PDF.';
      this.render();
      return;
    }
    const record = makeRecord(normalized);
    await this.loadRecord(record);
  }

  private async loadRecord(record: DocumentRecord): Promise<void> {
    this.current = record;
    this.draft = null;
    this.selectedId = undefined;
    this.mode = 'inspect';
    this.zoom = 1;
    this.error = '';
    this.busy = true;
    if (this.pdfDocument) await this.pdfDocument.destroy().catch(() => undefined);
    this.pdfDocument = null;
    this.render();
    try {
      if (record.mime === 'application/pdf') await this.renderPdfPage();
      else await this.renderImage(record.blob);
      this.busy = false;
      record.updatedAt = Date.now();
      await this.persistCurrent();
    } catch (error) {
      this.busy = false;
      this.current = null;
      this.error = `The file could not be opened. ${error instanceof Error ? error.message : 'It may be damaged or unsupported.'}`;
      this.render();
    }
  }

  private async renderImage(blob: Blob): Promise<void> {
    const bitmap = await createImageBitmap(blob);
    const maximum = 2600;
    const scale = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height));
    this.baseCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
    this.baseCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = this.baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas drawing is unavailable.');
    context.drawImage(bitmap, 0, 0, this.baseCanvas.width, this.baseCanvas.height);
    bitmap.close();
  }

  private async renderPdfPage(): Promise<void> {
    if (!this.current) return;
    if (!this.pdfDocument) {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      this.pdfDocument = await pdfjs.getDocument({ data: await this.current.blob.arrayBuffer() }).promise as unknown as PDFDocumentLike;
      this.current.pageCount = this.pdfDocument.numPages;
      this.current.page = Math.max(1, Math.min(this.current.page, this.current.pageCount));
    }
    const page = await this.pdfDocument.getPage(this.current.page);
    const initial = page.getViewport({ scale: 1.6 });
    const scaleDown = Math.min(1, 2600 / Math.max(initial.width, initial.height));
    const viewport = page.getViewport({ scale: 1.6 * scaleDown });
    this.baseCanvas.width = Math.round(viewport.width);
    this.baseCanvas.height = Math.round(viewport.height);
    const context = this.baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas drawing is unavailable.');
    await page.render({ canvasContext: context, viewport, canvas: this.baseCanvas }).promise;
  }

  private async changePage(delta: number): Promise<void> {
    if (!this.current || this.current.mime !== 'application/pdf') return;
    const next = Math.max(1, Math.min(this.current.pageCount, this.current.page + delta));
    if (next === this.current.page) return;
    this.current.page = next;
    this.selectedId = undefined;
    this.draft = null;
    this.busy = true;
    this.render();
    try {
      await this.renderPdfPage();
      this.busy = false;
      await this.persistCurrent();
    } catch {
      this.busy = false;
      this.error = 'That PDF page could not be rendered. Try another page or reopen the file.';
      this.render();
    }
  }

  private async persistCurrent(message?: string): Promise<void> {
    if (!this.current) return;
    this.current.updatedAt = Date.now();
    try {
      await saveDocument(this.current);
      this.documents = [this.current, ...this.documents.filter((item) => item.id !== this.current?.id)];
      if (message) this.showToast(message);
      else this.render();
    } catch {
      this.error = 'Changes are visible but could not be saved locally. Export the workspace to keep them.';
      this.render();
    }
  }

  private async removeAnnotation(id: string): Promise<void> {
    if (!this.current) return;
    const annotation = this.current.annotations.find((item) => item.id === id);
    if (!annotation || !window.confirm(`Delete the label “${annotation.label}”? You can undo this next.`)) return;
    this.undoAnnotation = annotation;
    this.current.annotations = this.current.annotations.filter((item) => item.id !== id);
    if (this.selectedId === id) this.selectedId = undefined;
    await this.persistCurrent();
    this.showToast(`Deleted “${annotation.label}”.`, 'undo', 'Undo');
  }

  private async undoDelete(): Promise<void> {
    if (!this.current || !this.undoAnnotation) return;
    this.current.annotations.push(this.undoAnnotation);
    this.selectedId = this.undoAnnotation.id;
    this.undoAnnotation = null;
    await this.persistCurrent('Label restored.');
  }

  private async removeCurrentDocument(): Promise<void> {
    if (!this.current || !window.confirm(`Remove “${this.current.name}” and all of its local labels from this device? Export first if you want a backup.`)) return;
    const id = this.current.id;
    await deleteDocument(id).catch(() => undefined);
    this.documents = this.documents.filter((item) => item.id !== id);
    this.current = null;
    this.baseCanvas.width = 0;
    this.render();
    this.showToast('The local file and its labels were removed.');
  }

  private async exportPng(): Promise<void> {
    if (!this.current) return;
    const output = document.createElement('canvas');
    output.width = this.baseCanvas.width;
    output.height = this.baseCanvas.height;
    this.drawVisibleCanvas(true, output);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, 'image/png'));
    if (!blob) { this.error = 'The annotated PNG could not be created. Try a smaller source file.'; this.render(); return; }
    downloadBlob(blob, `${baseName(this.current.name)}-page-${this.current.page}-annotated.png`);
    this.showToast('Annotated PNG exported.');
  }

  private async exportWorkspace(): Promise<void> {
    if (!this.current) return;
    try {
      const payload: WorkspaceExport = {
        schema: 'color-context.workspace', version: 1, exportedAt: new Date().toISOString(),
        document: { name: this.current.name, mime: this.current.mime, dataUrl: await blobToDataUrl(this.current.blob), annotations: this.current.annotations, page: this.current.page },
      };
      downloadBlob(new Blob([JSON.stringify(payload)], { type: 'application/json' }), `${baseName(this.current.name)}.colorcontext.json`);
      this.showToast('Restorable workspace exported.');
    } catch {
      this.error = 'The workspace could not be exported. Try the annotated PNG instead.';
      this.render();
    }
  }

  private async importWorkspace(file: File): Promise<void> {
    if (file.size > MAX_FILE_BYTES * 1.45) { this.error = 'That workspace is too large to import safely.'; this.render(); return; }
    try {
      const payload: unknown = JSON.parse(await file.text());
      if (!validateWorkspace(payload)) throw new Error('The workspace structure is not recognized.');
      const blob = await dataUrlToBlob(payload.document.dataUrl);
      if (blob.size > MAX_FILE_BYTES) throw new Error('The embedded source file exceeds 50 MB.');
      const now = Date.now();
      const record: DocumentRecord = { id: crypto.randomUUID(), name: payload.document.name, mime: payload.document.mime, blob, annotations: payload.document.annotations, page: payload.document.page, pageCount: 1, createdAt: now, updatedAt: now };
      await this.loadRecord(record);
      this.showToast('Workspace imported and saved locally.');
    } catch (error) {
      this.error = `That workspace could not be imported. ${error instanceof Error ? error.message : 'Choose a Color Context JSON export.'}`;
      this.render();
    }
  }

  private cycleTheme(): void {
    const current = document.documentElement.dataset.theme ?? 'system';
    const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
    this.applyTheme(next);
    this.showToast(`Theme set to ${next}.`);
  }

  private showToast(message: string, action?: string, actionLabel?: string): void {
    this.toast = { message, action, actionLabel };
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    if (!action) this.toastTimer = window.setTimeout(() => { this.toast = null; this.render(); }, 4500);
    this.render();
  }
}
