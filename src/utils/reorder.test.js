import { describe, expect, it } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('moves an item forward and backward without mutating the input', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns the same list for no-op or out-of-range moves', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, -1, 0)).toBe(list);
    expect(moveItem(list, 0, 2)).toBe(list);
  });
});
