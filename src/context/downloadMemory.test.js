import { describe, expect, it } from 'vitest';
import { trimItems } from './DownloadContext';

const item = (id, size) => ({ id, size });
const MB = 1024 * 1024;

describe('trimItems (download memory cap)', () => {
  it('keeps everything while under the caps', () => {
    const items = [item('a', MB), item('b', MB)];
    expect(trimItems(items, 10 * MB, 10)).toEqual({ items, evicted: 0 });
  });

  it('drops the oldest items first when total size is exceeded', () => {
    const result = trimItems([item('a', 4 * MB), item('b', 4 * MB), item('c', 4 * MB)], 9 * MB, 10);
    expect(result.items.map((entry) => entry.id)).toEqual(['b', 'c']);
    expect(result.evicted).toBe(1);
  });

  it('enforces the item count cap', () => {
    const result = trimItems([item('a', 1), item('b', 1), item('c', 1)], 100 * MB, 2);
    expect(result.items.map((entry) => entry.id)).toEqual(['b', 'c']);
  });

  it('always keeps the newest item, even if it alone exceeds the cap', () => {
    const result = trimItems([item('a', MB), item('huge', 50 * MB)], 10 * MB, 10);
    expect(result.items.map((entry) => entry.id)).toEqual(['huge']);
    expect(result.evicted).toBe(1);
  });
});
