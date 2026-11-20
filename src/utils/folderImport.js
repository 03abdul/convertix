const JUNK_NAMES = new Set(['thumbs.db', 'desktop.ini', '.ds_store']);

const relativePath = (file) => file.webkitRelativePath || file.name;
const extensionOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
};

/** True when `file` is allowed by an <input accept> string such as "image/*,.tif,.heic". */
export function matchesAccept(file, accept) {
  if (!accept) return true;
  const type = (file.type || '').toLowerCase();
  const extension = extensionOf(file.name);
  return accept.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean).some((token) => {
    if (token.startsWith('.')) return extension === token;
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

const isJunk = (file) => JUNK_NAMES.has(file.name.toLowerCase()) || file.name.startsWith('.');

/**
 * Describes what a chosen/dropped folder contains, for the import popup.
 * options: { accept, maxFiles, includeSubfolders }
 * Returns { folderName, total, hasSubfolders, subfolderFileCount, toAdd, overLimit, skipped, skippedGroups, totalBytes }
 */
export function analyzeFolder(files, { accept, maxFiles = Infinity, includeSubfolders = true } = {}) {
  const list = Array.from(files);
  const first = relativePath(list[0] || { name: '' });
  const folderName = first.includes('/') ? first.split('/')[0] : 'Selected files';

  // depth 1 = directly inside the chosen folder
  const depthOf = (file) => Math.max(1, relativePath(file).split('/').length - 1);
  const subfolderFileCount = list.filter((file) => depthOf(file) > 1).length;

  const considered = includeSubfolders ? list : list.filter((file) => depthOf(file) <= 1);
  const accepted = [];
  const skipped = [];
  for (const file of considered) {
    if (isJunk(file)) skipped.push({ file, label: 'hidden/system files' });
    else if (matchesAccept(file, accept)) accepted.push(file);
    else skipped.push({ file, label: extensionOf(file.name) || 'no extension' });
  }

  const toAdd = accepted.slice(0, Math.max(0, maxFiles));
  const counts = new Map();
  for (const { label } of skipped) counts.set(label, (counts.get(label) || 0) + 1);
  const skippedGroups = [...counts].sort((a, b) => b[1] - a[1]);

  return {
    folderName,
    total: list.length,
    hasSubfolders: subfolderFileCount > 0,
    subfolderFileCount,
    toAdd,
    overLimit: accepted.length - toAdd.length,
    skipped,
    skippedGroups,
    totalBytes: toAdd.reduce((sum, file) => sum + file.size, 0),
  };
}
