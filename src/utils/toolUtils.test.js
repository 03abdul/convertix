import { describe, expect, it } from 'vitest';
import { parsePageSelection, parseRanges, toRanges } from './pageRanges';
import { formatChange, summarizeResults } from './stats';
import { summarizeExif } from './exif';

describe('parsePageSelection', () => {
  it('parses single pages and ranges into sorted unique zero-based indices', () => {
    expect(parsePageSelection('1-3, 5, 3', 8)).toEqual([0, 1, 2, 4]);
    expect(parsePageSelection('8,2', 8)).toEqual([1, 7]);
  });

  it('treats empty input and "all" as every page', () => {
    expect(parsePageSelection('', 3)).toEqual([0, 1, 2]);
    expect(parsePageSelection(' ALL ', 2)).toEqual([0, 1]);
  });

  it('explains what is wrong with invalid input', () => {
    expect(() => parsePageSelection('0', 5)).toThrow('between 1 and 5');
    expect(() => parsePageSelection('6', 5)).toThrow('between 1 and 5');
    expect(() => parsePageSelection('4-2', 5)).toThrow('ends before it starts');
    expect(() => parsePageSelection('a,2', 5)).toThrow('not a valid page or range');
    expect(() => parsePageSelection('1-', 5)).toThrow('not a valid page or range');
  });
});

describe('toRanges / parseRanges', () => {
  it('groups contiguous pages into one-based ranges', () => {
    expect(toRanges([0, 1, 2, 4, 5, 9])).toEqual([{ start: 1, end: 3 }, { start: 5, end: 6 }, { start: 10, end: 10 }]);
  });

  it('keeps each comma-separated part as its own output range', () => {
    expect(parseRanges('1-3, 5, 7-9', 10)).toEqual([{ start: 1, end: 3 }, { start: 5, end: 5 }, { start: 7, end: 9 }]);
    expect(() => parseRanges('  ', 10)).toThrow('Enter the pages');
  });
});

describe('summarizeResults / formatChange', () => {
  it('totals only finished results and reports savings', () => {
    const summary = summarizeResults([
      { status: 'done', originalSize: 1000, newSize: 400 },
      { status: 'done', originalSize: 1000, newSize: 600 },
      { status: 'error', originalSize: 5000, newSize: 0 },
      undefined,
    ]);
    expect(summary).toMatchObject({ done: 2, failed: 1, originalSize: 2000, newSize: 1000, saved: 1000, percent: 50 });
  });

  it('formats size changes with a sign and sensible rounding', () => {
    expect(formatChange(1000, 340)).toBe('-66%');
    expect(formatChange(1000, 960)).toBe('-4.0%');
    expect(formatChange(1000, 1100)).toBe('+10%');
    expect(formatChange(1000, 999)).toBe('');
    expect(formatChange(0, 10)).toBe('');
  });
});

describe('summarizeExif', () => {
  it('returns friendly fields and flags embedded GPS location', () => {
    const summary = summarizeExif({
      '0th': { 271: 'Canon\0', 272: 'EOS R6', 305: 'Lightroom' },
      Exif: { 36867: '2024:05:17 09:30:00', 33434: [1, 250], 33437: [28, 10], 34855: 400, 37386: [50, 1] },
      GPS: { 1: 'N', 2: [[48, 1], [51, 1], [24, 1]] },
    });
    expect(summary.hasLocation).toBe(true);
    expect(summary.hasCameraInfo).toBe(true);
    expect(Object.fromEntries(summary.fields)).toMatchObject({
      Camera: 'Canon EOS R6',
      Taken: '2024-05-17 09:30:00',
      Exposure: '1/250s',
      Aperture: 'f/2.8',
      ISO: '400',
      'Focal length': '50 mm',
      Software: 'Lightroom',
    });
  });

  it('copes with missing or empty EXIF', () => {
    expect(summarizeExif(null)).toEqual({ fields: [], hasLocation: false, hasCameraInfo: false });
    expect(summarizeExif({ '0th': {}, Exif: {}, GPS: {} }).hasLocation).toBe(false);
  });
});
