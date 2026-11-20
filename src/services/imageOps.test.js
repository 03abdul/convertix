// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./imageService', () => {
  const result = (name) => ({ blob: new Blob([name], { type: 'image/png' }), name });
  return {
    convertFormat: vi.fn(async (file, format) => result(`${file.name.replace(/\.[^.]+$/, '')}.${format}`)),
    compressImage: vi.fn(async (file) => result(file.name)),
    resizeImage: vi.fn(async (file) => result(file.name)),
    compressToTargetSize: vi.fn(async (file) => ({ ...result(file.name), targetReached: true })),
    cropImage: vi.fn(async (file) => result(file.name)),
    applyAdjustments: vi.fn(async (file) => result(file.name)),
    applyWatermark: vi.fn(async (file) => result(file.name)),
  };
});

import * as service from './imageService';
import { runPipeline } from './imageOps';

const input = () => new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

beforeEach(() => vi.clearAllMocks());

describe('runPipeline', () => {
  it('feeds each step the previous step output and returns the last result', async () => {
    const result = await runPipeline(input(), [
      { type: 'resize', width: 800, height: 600, maintainAspect: true },
      { type: 'convert', format: 'webp', quality: 80 },
    ]);

    expect(service.resizeImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'photo.jpg' }), 800, 600, true, 0.92, undefined);
    // the converter received the File produced by the resize step
    expect(service.convertFormat).toHaveBeenCalledWith(expect.any(File), 'webp', 0.8, { preserveMetadata: false });
    expect(result.name).toBe('photo.webp');
  });

  it('passes the metadata preference to conversions and target size in bytes', async () => {
    await runPipeline(input(), [{ type: 'convert', format: 'jpg', quality: 90 }], { preserveMetadata: true });
    expect(service.convertFormat).toHaveBeenCalledWith(expect.any(File), 'jpg', 0.9, { preserveMetadata: true });

    await runPipeline(input(), [{ type: 'target-size', bytes: 2048 }]);
    expect(service.compressToTargetSize).toHaveBeenCalledWith(expect.any(File), 2048);
  });

  it('converts to lossless PNG without a quality value', async () => {
    await runPipeline(input(), [{ type: 'convert', format: 'png' }]);
    expect(service.convertFormat).toHaveBeenCalledWith(expect.any(File), 'png', undefined, { preserveMetadata: false });
  });

  it('rejects empty pipelines and unknown steps', async () => {
    await expect(runPipeline(input(), [])).rejects.toThrow('Add at least one');
    await expect(runPipeline(input(), [{ type: 'teleport' }])).rejects.toThrow('Unknown processing step: teleport');
  });
});
