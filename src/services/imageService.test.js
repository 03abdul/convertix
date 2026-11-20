// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CROP_ASPECT_RATIOS,
  SOCIAL_MEDIA_PRESETS,
  canvasToBlob,
  getCenteredCropRect,
  getDefaultOutputFormat,
  getFormatFromExtension,
  drawWatermark,
  getPositionCoords,
  getSupportedOutputFormats,
  isSupportedImageFile,
  resizeImage,
  validateImageFile,
} from './imageService';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockImageCanvas() {
  const drawImage = vi.fn();
  const context = {
    drawImage,
    fillRect: vi.fn(),
    set imageSmoothingQuality(value) { this.quality = value; },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (callback, mime) => callback(new Blob(['processed'], { type: mime })),
  };
  const createElement = document.createElement.bind(document);

  vi.stubGlobal('Image', class {
    set src(value) {
      this.url = value;
      this.naturalWidth = 400;
      this.naturalHeight = 200;
      this.onload();
    }
  });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:source',
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => (
    tagName === 'canvas' ? canvas : createElement(tagName)
  ));

  return { canvas, drawImage };
}

describe('image file helpers', () => {
  it('detects supported extensions without case sensitivity', () => {
    expect(getFormatFromExtension('PHOTO.JpEg')).toBe('jpeg');
    expect(getFormatFromExtension('no-extension')).toBeNull();
  });

  it('rejects unsupported image types and files above the size limit', () => {
    expect(() => validateImageFile(new File(['x'], 'notes.txt'))).toThrow('unsupported image format');
    const largeImage = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeImage, 'size', { value: 100 * 1024 * 1024 + 1 });
    expect(() => validateImageFile(largeImage)).toThrow('smaller than 100 MB');
  });

  it('recognizes modern input extensions and chooses a safe default output format', () => {
    const heic = new File(['image'], 'photo.heic', { type: 'image/heic' });
    const avif = new File(['image'], 'photo.avif', { type: 'image/avif' });
    expect(isSupportedImageFile(heic)).toBe(true);
    expect(isSupportedImageFile(avif)).toBe(true);
    expect(getDefaultOutputFormat(heic)).toBe('jpg');
    expect(getDefaultOutputFormat(avif)).toBe('png');
    expect(getDefaultOutputFormat(new File(['image'], 'photo.gif', { type: 'image/gif' }))).toBe('png');
  });
});

describe('image processing presets', () => {
  it('creates centered crop rectangles for aspect ratios', () => {
    expect(getCenteredCropRect(400, 200, CROP_ASPECT_RATIOS.square)).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 200,
    });
    expect(getCenteredCropRect(400, 300, CROP_ASPECT_RATIOS['16:9'])).toEqual({
      x: 0,
      y: 37,
      width: 400,
      height: 225,
    });
  });

  it('rejects invalid crop dimensions and ratios', () => {
    expect(() => getCenteredCropRect(0, 200, 1)).toThrow('positive numbers');
    expect(() => getCenteredCropRect(400, 200, 0)).toThrow('positive number');
  });

  it('exposes social export dimensions', () => {
    expect(SOCIAL_MEDIA_PRESETS.instagramStory).toEqual({ width: 1080, height: 1920 });
    expect(SOCIAL_MEDIA_PRESETS.youtubeThumbnail).toEqual({ width: 1280, height: 720 });
  });
});

describe('resize modes', () => {
  it('fills the requested dimensions by cropping the source around its center', async () => {
    const { canvas, drawImage } = mockImageCanvas();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    await resizeImage(file, 100, 100, true, undefined, { mode: 'fill' });

    expect([canvas.width, canvas.height]).toEqual([100, 100]);
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(Object),
      100, 0, 200, 200,
      0, 0, 100, 100
    );
  });

  it('fits inside an exact canvas without distorting the source', async () => {
    const { canvas, drawImage } = mockImageCanvas();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    await resizeImage(file, 100, 100, true, undefined, { mode: 'fit', exactCanvas: true });

    expect([canvas.width, canvas.height]).toEqual([100, 100]);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 25, 100, 50);
  });

  it('scales from the source dimensions by percentage', async () => {
    const { canvas } = mockImageCanvas();
    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    await resizeImage(file, 100, 100, true, undefined, { percentage: 50 });

    expect([canvas.width, canvas.height]).toEqual([200, 100]);
  });
});

describe('BMP encoding', () => {
  it('creates a BMP with padded rows, correct signature, and dimensions', async () => {
    const canvas = {
      width: 1,
      height: 1,
      getContext: () => ({
        getImageData: () => ({ data: new Uint8ClampedArray([255, 0, 0, 255]) }),
      }),
    };

    const blob = await canvasToBlob(canvas, 'image/bmp');
    const bytes = new DataView(await blob.arrayBuffer());

    expect(blob.type).toBe('image/bmp');
    expect(bytes.getUint8(0)).toBe(0x42);
    expect(bytes.getUint8(1)).toBe(0x4d);
    expect(bytes.getUint32(2, true)).toBe(58);
    expect(bytes.getInt32(18, true)).toBe(1);
    expect(bytes.getInt32(22, true)).toBe(1);
    expect(bytes.getUint8(54)).toBe(0);
    expect(bytes.getUint8(56)).toBe(255);
  });
});

describe('encoder support', () => {
  it('rejects instead of silently returning PNG when the browser cannot encode a format', async () => {
    const canvas = {
      width: 1,
      height: 1,
      // what browsers do for unsupported types: fall back to PNG
      toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    };
    await expect(canvasToBlob(canvas, 'image/webp', 0.8)).rejects.toThrow('cannot encode WebP');
    await expect(canvasToBlob(canvas, 'image/png')).resolves.toBeInstanceOf(Blob);
  });

  it('encodes through OffscreenCanvas.convertToBlob when running in a worker', async () => {
    const convertToBlob = vi.fn(async ({ type }) => new Blob(['ok'], { type }));
    const blob = await canvasToBlob({ width: 1, height: 1, convertToBlob }, 'image/jpeg', 0.5);
    expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 0.5 });
    expect(blob.type).toBe('image/jpeg');
  });

  it('omits WebP when the browser falls back to PNG, and always offers PNG, JPG and BMP', async () => {
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => (
      tagName === 'canvas'
        ? { width: 1, height: 1, toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' })) }
        : createElement(tagName)
    ));
    expect(await getSupportedOutputFormats()).toEqual(['png', 'jpg', 'bmp']);
  });
});

describe('watermark positioning', () => {
  it('keeps the whole element inside the canvas at every anchor', () => {
    const W = 1000;
    const H = 600;
    const ew = 300;
    const eh = 100;
    for (const position of ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
      const { x, y } = getPositionCoords(position, W, H, ew, eh);
      expect(x - ew / 2).toBeGreaterThanOrEqual(0);
      expect(x + ew / 2).toBeLessThanOrEqual(W);
      expect(y - eh / 2).toBeGreaterThanOrEqual(0);
      expect(y + eh / 2).toBeLessThanOrEqual(H);
    }
  });

  it('places anchors where their names say', () => {
    const topLeft = getPositionCoords('top-left', 1000, 600, 200, 80);
    const bottomRight = getPositionCoords('bottom-right', 1000, 600, 200, 80);
    const center = getPositionCoords('center', 1000, 600, 200, 80);
    expect(center).toEqual({ x: 500, y: 300 });
    expect(topLeft.x).toBeLessThan(center.x);
    expect(topLeft.y).toBeLessThan(center.y);
    expect(bottomRight.x).toBeGreaterThan(center.x);
    expect(bottomRight.y).toBeGreaterThan(center.y);
    // symmetric margins
    expect(topLeft.x - 100).toBeCloseTo(1000 - (bottomRight.x + 100));
    expect(topLeft.y - 40).toBeCloseTo(600 - (bottomRight.y + 40));
  });

  it('draws an image watermark from its centre-based position (not as a top-left corner)', () => {
    const calls = [];
    const ctx = { save() {}, restore() {}, drawImage: (...args) => calls.push(args), set globalAlpha(v) {} };
    const overlay = { width: 200, height: 100 };
    drawWatermark(ctx, 1000, 600, { type: 'image', position: 'center', opacity: 100, scale: 1 }, overlay);
    expect(calls[0]).toEqual([overlay, 400, 250, 200, 100]);
  });
});
