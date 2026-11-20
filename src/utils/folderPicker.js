/**
 * Folder selection without the browser's "Upload N files to this site?" prompt.
 *
 * Chrome and Edge offer window.showDirectoryPicker(): it opens the normal folder chooser and gives the
 * page read access to the chosen folder. (The older <input webkitdirectory> picker is what shows the
 * "This will upload all files from …" message.) Other browsers fall back to that input.
 */
export const canUseDirectoryPicker = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

/** True when the user simply closed the chooser. */
export const isPickerCancelled = (error) => error?.name === 'AbortError';

const MAX_SCANNED_FILES = 20000;

/**
 * Opens the folder chooser and returns every file inside (subfolders included), each with its folder
 * path in `webkitRelativePath` so the review popup can show the folder name and subfolder counts.
 * Throws an AbortError if the user cancels.
 */
export async function pickFolderFiles(picker = window.showDirectoryPicker.bind(window)) {
  const root = await picker({ mode: 'read' });
  const files = [];

  const walk = async (directory, prefix) => {
    for await (const [name, handle] of directory.entries()) {
      if (files.length >= MAX_SCANNED_FILES) return;
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        try {
          Object.defineProperty(file, 'webkitRelativePath', { value: `${prefix}${name}`, configurable: true });
        } catch { /* keep the plain file */ }
        files.push(file);
      } else if (handle.kind === 'directory') {
        await walk(handle, `${prefix}${name}/`);
      }
    }
  };

  await walk(root, `${root.name}/`);
  return files;
}
