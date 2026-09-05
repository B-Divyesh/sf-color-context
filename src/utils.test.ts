import { describe, expect, it } from 'vitest';
import { dataUrlToBlob, rgbToHex, validateWorkspace } from './utils';

describe('rgbToHex', () => {
  it('clamps, rounds, and pads channel values', () => {
    expect(rgbToHex(-10, 15.6, 300)).toBe('#0010FF');
  });
});

describe('workspace validation', () => {
  it('accepts a valid local workspace', () => {
    expect(validateWorkspace({
      schema: 'color-context.workspace',
      version: 1,
      exportedAt: '2026-08-27T00:00:00.000Z',
      document: {
        name: 'chart.png',
        mime: 'image/png',
        dataUrl: 'data:image/png;base64,AA==',
        page: 1,
        annotations: [{ id: '1', x: 4, y: 5, page: 1, color: '#000000', label: 'warning', pattern: 'dots', createdAt: 1, updatedAt: 1 }],
      },
    })).toBe(true);
  });

  it('rejects unexpected schemas and unsafe annotation shapes', () => {
    expect(validateWorkspace({ schema: 'other', version: 1 })).toBe(false);
    expect(validateWorkspace({
      schema: 'color-context.workspace', version: 1,
      document: { name: 'x', mime: 'image/png', dataUrl: 'data:image/png;base64,AA==', page: 1, annotations: [{ x: -1 }] },
    })).toBe(false);
  });
});

describe('workspace source decoding', () => {
  it('decodes a base64 data URL without a network request', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,AQIDBA==');
    expect(blob.type).toBe('image/png');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });
});
