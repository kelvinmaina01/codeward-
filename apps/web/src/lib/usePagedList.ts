import { useState, useCallback } from 'react';

export interface PagedList<T> {
  /** The slice to render right now. */
  visible: T[];
  total: number;
  remaining: number;
  hasMore: boolean;
  pageSize: number;
  showMore: () => void;
}

interface Options {
  pageSize?: number;
  /**
   * Any string that identifies the current filter/tab. When it changes the window snaps back
   * to the first page, so switching a filter never lands the user on an empty tail.
   */
  resetKey?: string;
}

/**
 * "Load more" windowing for long lists. Chosen over virtualization on purpose: rows here have
 * variable height (inline <details> expansion, wrapping on mobile) and Ctrl+F must keep working.
 * 25-row pages bound the DOM to a few hundred nodes at worst.
 */
export function usePagedList<T>(items: readonly T[], { pageSize = 25, resetKey = '' }: Options = {}): PagedList<T> {
  const [state, setState] = useState({ key: resetKey, limit: pageSize });

  // Adjust state during render when the reset key changes — React re-runs the render
  // immediately with the new value, so the first paint after a filter change is already page 1.
  if (state.key !== resetKey) {
    setState({ key: resetKey, limit: pageSize });
  }
  const limit = state.key === resetKey ? state.limit : pageSize;

  const showMore = useCallback(() => {
    setState((s) => ({ key: s.key, limit: s.limit + pageSize }));
  }, [pageSize]);

  const total = items.length;
  const visible = total > limit ? items.slice(0, limit) : (items as T[]);
  const remaining = Math.max(0, total - visible.length);

  return { visible, total, remaining, hasMore: remaining > 0, pageSize, showMore };
}
