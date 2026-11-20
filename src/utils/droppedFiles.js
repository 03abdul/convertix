/**
 * Reads everything from a drop, including whole folders (and their subfolders), keeping each file's
 * folder path in `webkitRelativePath`. Dropping never triggers the browser's "upload this folder?"
 * prompt, which only appears for the folder *picker*.
 *
 * Returns { files, hadDirectory }.
 */
export async function collectDroppedFiles(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length === 0) return { files: Array.from(dataTransfer?.files || []), hadDirectory: false };

  const files = [];
  const state = { hadDirectory: false };

  const traverse = (entry) => new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((file) => {
        try {
          Object.defineProperty(file, 'webkitRelativePath', { value: entry.fullPath.replace(/^\//, ''), configurable: true });
        } catch { /* keep the plain file */ }
        files.push(file);
        resolve();
      }, () => resolve());
    } else if (entry.isDirectory) {
      state.hadDirectory = true;
      const reader = entry.createReader();
      const readAll = () => {
        reader.readEntries(async (children) => {
          if (children.length === 0) { resolve(); return; }
          for (const child of children) await traverse(child);
          readAll();
        }, () => resolve());
      };
      readAll();
    } else {
      resolve();
    }
  });

  await Promise.all(entries.map(traverse));
  return { files, hadDirectory: state.hadDirectory };
}

/** True when a drag carries files (as opposed to text, or an item being reordered inside the page). */
export function dragHasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}
