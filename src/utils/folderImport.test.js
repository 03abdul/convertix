import { describe, expect, it } from 'vitest';
import { analyzeFolder, matchesAccept } from './folderImport';

const file = (path, type = '', size = 100) => {
  const f = new File([new Uint8Array(size)], path.split('/').pop(), { type });
  Object.defineProperty(f, 'webkitRelativePath', { value: path });
  return f;
};
const IMAGES = 'image/*,.tif,.tiff,.heic';

describe('matchesAccept', () => {
  it('handles mime wildcards, exact mime types and extensions', () => {
    expect(matchesAccept(new File([''], 'a.png', { type: 'image/png' }), IMAGES)).toBe(true);
    expect(matchesAccept(new File([''], 'a.HEIC', { type: '' }), IMAGES)).toBe(true); // browsers often give HEIC no type
    expect(matchesAccept(new File([''], 'a.txt', { type: 'text/plain' }), IMAGES)).toBe(false);
    expect(matchesAccept(new File([''], 'a.pdf', { type: 'application/pdf' }), 'application/pdf,.pdf')).toBe(true);
    expect(matchesAccept(new File([''], 'a.anything'), undefined)).toBe(true);
  });
});

describe('analyzeFolder', () => {
  const folder = [
    file('Holiday/a.jpg', 'image/jpeg', 1000),
    file('Holiday/b.png', 'image/png', 2000),
    file('Holiday/notes.txt', 'text/plain'),
    file('Holiday/.DS_Store'),
    file('Holiday/Thumbs.db'),
    file('Holiday/Day2/c.jpg', 'image/jpeg', 3000),
    file('Holiday/Day2/more.txt', 'text/plain'),
    file('Holiday/readme'),
  ];

  it('reports the folder name, what will be added and why other files are skipped', () => {
    const result = analyzeFolder(folder, { accept: IMAGES });
    expect(result.folderName).toBe('Holiday');
    expect(result.total).toBe(8);
    expect(result.toAdd.map((f) => f.name)).toEqual(['a.jpg', 'b.png', 'c.jpg']);
    expect(result.totalBytes).toBe(6000);
    expect(Object.fromEntries(result.skippedGroups)).toEqual({ '.txt': 2, 'hidden/system files': 2, 'no extension': 1 });
  });

  it('can exclude files that live in subfolders', () => {
    const result = analyzeFolder(folder, { accept: IMAGES, includeSubfolders: false });
    expect(result.hasSubfolders).toBe(true);
    expect(result.subfolderFileCount).toBe(2);
    expect(result.toAdd.map((f) => f.name)).toEqual(['a.jpg', 'b.png']);
  });

  it('applies the per-run limit and says how many are left out', () => {
    const many = Array.from({ length: 12 }, (_, i) => file(`Pics/p${i}.png`, 'image/png'));
    const result = analyzeFolder(many, { accept: IMAGES, maxFiles: 5 });
    expect(result.toAdd).toHaveLength(5);
    expect(result.overLimit).toBe(7);
  });

  it('copes with a plain file selection that has no folder path', () => {
    const result = analyzeFolder([new File([''], 'x.png', { type: 'image/png' })], { accept: IMAGES });
    expect(result.folderName).toBe('Selected files');
    expect(result.hasSubfolders).toBe(false);
    expect(result.toAdd).toHaveLength(1);
  });

  it('handles a folder with nothing usable', () => {
    const result = analyzeFolder([file('Docs/a.txt', 'text/plain')], { accept: IMAGES });
    expect(result.toAdd).toHaveLength(0);
    expect(result.skippedGroups).toEqual([['.txt', 1]]);
  });
});
