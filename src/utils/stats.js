/**
 * Totals for a finished run. `results` entries need { status, originalSize, newSize }.
 * `saved` is positive when outputs are smaller than inputs.
 */
export function summarizeResults(results) {
  const list = results.filter(Boolean);
  const done = list.filter((item) => item.status === 'done');
  const failed = list.filter((item) => item.status === 'error').length;
  const originalSize = done.reduce((sum, item) => sum + (item.originalSize || 0), 0);
  const newSize = done.reduce((sum, item) => sum + (item.newSize || 0), 0);
  const saved = originalSize - newSize;
  return {
    done: done.length,
    failed,
    originalSize,
    newSize,
    saved,
    percent: originalSize > 0 ? (saved / originalSize) * 100 : 0,
  };
}

/** "-34%" / "+5%" label for a size change, or '' when nothing changed. */
export function formatChange(original, current) {
  if (!original || original <= 0) return '';
  const percent = ((original - current) / original) * 100;
  if (Math.abs(percent) < 0.5) return '';
  const rounded = Math.abs(percent) >= 10 ? Math.round(Math.abs(percent)) : Math.abs(percent).toFixed(1);
  return `${percent > 0 ? '-' : '+'}${rounded}%`;
}
