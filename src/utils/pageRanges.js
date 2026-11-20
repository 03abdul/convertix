/**
 * Parses a page selection such as "1-3, 5, 8-10" into sorted, de-duplicated zero-based page indices.
 * "all" or an empty string selects every page. Throws a user-readable Error for invalid input.
 */
export function parsePageSelection(input, total) {
  const text = String(input ?? '').trim().toLowerCase();
  if (!Number.isInteger(total) || total < 1) throw new Error('This PDF has no pages.');
  if (text === '' || text === 'all') return Array.from({ length: total }, (_, index) => index);

  const pages = new Set();
  for (const part of text.split(',')) {
    const token = part.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(token);
    if (!match) throw new Error(`"${token}" is not a valid page or range. Use numbers like 1,3,5-8.`);
    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);
    if (start < 1 || end < 1 || start > total || end > total) {
      throw new Error(`Pages must be between 1 and ${total}.`);
    }
    if (end < start) throw new Error(`"${token}" ends before it starts.`);
    for (let page = start; page <= end; page++) pages.add(page - 1);
  }
  return [...pages].sort((a, b) => a - b);
}

/**
 * Splits a selection into contiguous runs, e.g. [0,1,2,4,5] -> [{start:1,end:3},{start:5,end:6}] (one-based).
 * Used to turn "1-3, 5-6" into one output file per range.
 */
export function toRanges(indices) {
  const ranges = [];
  for (const index of indices) {
    const last = ranges[ranges.length - 1];
    if (last && index === last.end) last.end = index + 1;
    else ranges.push({ start: index + 1, end: index + 1 });
  }
  return ranges;
}

/** Parses "1-3, 5, 7-9" into explicit ranges, keeping the order and grouping the user typed. */
export function parseRanges(input, total) {
  const text = String(input ?? '').trim();
  if (!text) throw new Error('Enter the pages to include, for example 1-3, 5.');
  const ranges = [];
  for (const part of text.split(',')) {
    const [range] = toRanges(parsePageSelection(part, total));
    if (range) ranges.push(range);
    // A part like "2-4" is one contiguous run; toRanges of a single part always yields one range.
  }
  return ranges;
}
