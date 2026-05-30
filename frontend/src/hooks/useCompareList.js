import { useCallback, useEffect, useState } from 'react';
import { MAX_COMPARE } from '../lib/constants';
import {
  loadCompareItems,
  makeCompareItem,
  normalizeCompareItem,
  saveCompareItems,
} from '../lib/compareStore';
import { deptIndexKey } from '../lib/deptUtils';

export function useCompareList() {
  const [items, setItems] = useState(() => loadCompareItems());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const normalized = items.map(normalizeCompareItem).filter(Boolean);
    if (normalized.length !== items.length) {
      setItems(normalized);
      return;
    }
    saveCompareItems(normalized);
  }, [items]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((anchor) => {
    const key = deptIndexKey(anchor);
    if (items.some((i) => i.key === key)) {
      setToast({ type: 'info', message: '此校系已在比對清單中' });
      return { ok: false, reason: 'duplicate' };
    }
    if (items.length >= MAX_COMPARE) {
      setToast({ type: 'warn', message: `最多只能比對 ${MAX_COMPARE} 個校系` });
      return { ok: false, reason: 'full' };
    }
    const item = makeCompareItem(anchor);
    setItems((prev) => [...prev, item]);
    setToast({ type: 'success', message: '已加入校系比對' });
    return { ok: true };
  }, [items]);

  const remove = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const toggle = useCallback(
    (anchor) => {
      const key = deptIndexKey(anchor);
      if (items.some((i) => i.key === key)) {
        setItems((prev) => prev.filter((i) => i.key !== key));
        setToast({ type: 'info', message: '已移出校系比對' });
        return { ok: true, action: 'removed' };
      }
      return add(anchor);
    },
    [items, add]
  );

  const clear = useCallback(() => setItems([]), []);

  const isInList = useCallback(
    (anchor) => items.some((i) => i.key === deptIndexKey(anchor)),
    [items]
  );

  return {
    items,
    add,
    remove,
    toggle,
    clear,
    isInList,
    canAdd: items.length < MAX_COMPARE,
    toast,
    dismissToast: () => setToast(null),
  };
}
