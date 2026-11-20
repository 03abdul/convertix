import { describe, expect, it } from 'vitest';
import { MAX_TOASTS, TOAST_DURATION, pushToast, removeToast } from './toasts';

const toast = (id, message, type = 'error') => ({ id, message, type });

describe('pushToast', () => {
  it('appends toasts and falls back to "error" for unknown types', () => {
    const list = pushToast(pushToast([], toast('a', 'First', 'success')), toast('b', 'Second', 'nonsense'));
    expect(list.map((item) => [item.message, item.type, item.count])).toEqual([['First', 'success', 1], ['Second', 'error', 1]]);
  });

  it('merges identical messages into one toast with a counter and restarts its timer', () => {
    let list = pushToast([], toast('a', '3 files failed'));
    list = pushToast(list, toast('b', '3 files failed'));
    list = pushToast(list, toast('c', '3 files failed'));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'a', count: 3, nonce: 2 });
  });

  it('keeps different types of the same message separate', () => {
    const list = pushToast(pushToast([], toast('a', 'Saved', 'success')), toast('b', 'Saved', 'info'));
    expect(list).toHaveLength(2);
  });

  it('never shows more than the maximum, dropping the oldest first', () => {
    let list = [];
    for (let i = 0; i < MAX_TOASTS + 3; i++) list = pushToast(list, toast(`t${i}`, `message ${i}`));
    expect(list).toHaveLength(MAX_TOASTS);
    expect(list[0].message).toBe('message 3');
    expect(list[list.length - 1].message).toBe(`message ${MAX_TOASTS + 2}`);
  });
});

describe('removeToast / durations', () => {
  it('removes by id', () => {
    const list = pushToast(pushToast([], toast('a', 'A')), toast('b', 'B'));
    expect(removeToast(list, 'a').map((item) => item.id)).toEqual(['b']);
  });

  it('gives errors the longest time on screen', () => {
    expect(TOAST_DURATION.error).toBeGreaterThan(TOAST_DURATION.warning);
    expect(TOAST_DURATION.warning).toBeGreaterThan(TOAST_DURATION.success);
  });
});
