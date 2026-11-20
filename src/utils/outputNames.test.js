import { describe, expect, it } from 'vitest';
import { applyOutputNames } from './outputNames';

describe('applyOutputNames', () => {
  it('replaces filename tokens and preserves the output extension', () => {
    const [result] = applyOutputNames(
      [{ name: 'photo.webp', file: { name: 'holiday photo.png' } }],
      '{name}-{operation}.{ext}',
      'resize'
    );

    expect(result.name).toBe('holiday photo-resize.webp');
  });

  it('keeps stable indices for retried results', () => {
    const results = applyOutputNames(
      [
        { name: 'output.png', file: { name: 'same.jpg' }, outputIndex: 1 },
        { name: 'output.png', file: { name: 'same.jpg' }, outputIndex: 4 },
      ],
      '{index}-{name}.{ext}',
      'convert'
    );

    expect(results.map((result) => result.name)).toEqual([
      '002-same.png',
      '005-same.png',
    ]);
  });

  it('disambiguates duplicate names', () => {
    const results = applyOutputNames(
      [
        { name: 'output.png', file: { name: 'same.jpg' } },
        { name: 'output.png', file: { name: 'same.jpg' } },
      ],
      '{name}.{ext}',
      'convert'
    );

    expect(results.map((result) => result.name)).toEqual([
      'same.png',
      'same (1).png',
    ]);
  });

  it('retains the output extension when a pattern omits it', () => {
    const [result] = applyOutputNames(
      [{ name: 'photo.webp', file: { name: 'holiday.png' } }],
      'processed-{name}',
      'resize'
    );

    expect(result.name).toBe('processed-holiday.webp');
  });
});
