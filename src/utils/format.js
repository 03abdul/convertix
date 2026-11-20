export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function percentChange(original, current) {
  if (original === 0) return 0;
  return ((original - current) / original) * 100;
}

export function getFileNameWithoutExt(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.substring(0, dot) : name;
}

export function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.substring(dot + 1).toLowerCase() : '';
}

export function swapExtension(name, newExt) {
  return `${getFileNameWithoutExt(name)}.${newExt}`;
}

export function formatList(arr) {
  if (!arr || arr.length === 0) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function pluralize(count, word) {
  return count === 1 ? `${count} ${word}` : `${count} ${word}s`;
}
