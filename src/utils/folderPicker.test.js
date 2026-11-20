import { describe, expect, it } from 'vitest';
import { isPickerCancelled, pickFolderFiles } from './folderPicker';

const fileHandle = (name, content = 'x') => ({ kind: 'file', name, getFile: async () => new File([content], name) });
const dirHandle = (name, children) => ({
  kind: 'directory',
  name,
  async *entries() { for (const child of children) yield [child.name, child]; },
});

describe('pickFolderFiles', () => {
  it('reads every file, including subfolders, and keeps each file\'s folder path', async () => {
    const root = dirHandle('Holiday', [
      fileHandle('a.png'),
      dirHandle('Day2', [fileHandle('b.png'), dirHandle('Deep', [fileHandle('c.png')])]),
    ]);
    const files = await pickFolderFiles(async (options) => {
      expect(options).toEqual({ mode: 'read' }); // read-only access is all we need
      return root;
    });
    expect(files.map((file) => file.webkitRelativePath)).toEqual(['Holiday/a.png', 'Holiday/Day2/b.png', 'Holiday/Day2/Deep/c.png']);
    expect(files.map((file) => file.name)).toEqual(['a.png', 'b.png', 'c.png']);
  });

  it('propagates a cancelled chooser so callers can ignore it', async () => {
    const cancelled = Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' });
    await expect(pickFolderFiles(async () => { throw cancelled; })).rejects.toBe(cancelled);
    expect(isPickerCancelled(cancelled)).toBe(true);
    expect(isPickerCancelled(new Error('nope'))).toBe(false);
  });
});
