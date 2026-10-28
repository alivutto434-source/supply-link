import { INITIAL_TRADE_STATE } from '../data/initialData';
import { StorageHealth, TradeStoreState } from '../types/trade';

export const STORAGE_KEY = 'supplylink_bd_trade_store_v1';
const ESTIMATED_MAX_BYTES = 5 * 1024 * 1024; // Standard 5 MB browser localStorage quota

function cloneInitialState(): TradeStoreState {
  return JSON.parse(JSON.stringify(INITIAL_TRADE_STATE)) as TradeStoreState;
}

export function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.code === 22 ||
    err.code === 1014 ||
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  );
}

export function calculateLocalStorageBytes(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  let totalBytes = 0;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key) {
      const value = window.localStorage.getItem(key) ?? '';
      // Browser localStorage stores strings in UTF-16 (2 bytes per code unit)
      totalBytes += (key.length + value.length) * 2;
    }
  }
  return totalBytes;
}

export function probeStorageWritable(): { writable: boolean; quotaExceeded: boolean } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { writable: false, quotaExceeded: false };
  }
  const probeKey = '__supplylink_quota_check__';
  try {
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return { writable: true, quotaExceeded: false };
  } catch (err) {
    return { writable: false, quotaExceeded: isQuotaExceededError(err) };
  }
}

export function inspectStorageHealth(customError: string | null = null): StorageHealth {
  const usedBytes = calculateLocalStorageBytes();
  const usagePercent = Math.min(100, Number(((usedBytes / ESTIMATED_MAX_BYTES) * 100).toFixed(2)));
  const probe = probeStorageWritable();
  const isFull = probe.quotaExceeded || usagePercent >= 99;
  const isNearFull = !isFull && usagePercent >= 80;

  return {
    usedBytes,
    maxBytes: ESTIMATED_MAX_BYTES,
    usagePercent,
    isNearFull,
    isFull,
    errorMessage:
      customError ??
      (isFull
        ? 'Browser localStorage has reached its maximum capacity. Clear saved changes to free up space.'
        : null),
  };
}

export function loadTradeState(): TradeStoreState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return cloneInitialState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = cloneInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<TradeStoreState>;
    // Ensure baseline records are always structurally valid
    return {
      dealerName: parsed.dealerName || INITIAL_TRADE_STATE.dealerName,
      baseDiscountPercentage:
        typeof parsed.baseDiscountPercentage === 'number'
          ? parsed.baseDiscountPercentage
          : INITIAL_TRADE_STATE.baseDiscountPercentage,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : cloneInitialState().suppliers,
      products: Array.isArray(parsed.products) ? parsed.products : cloneInitialState().products,
      bonusSlabs: Array.isArray(parsed.bonusSlabs)
        ? parsed.bonusSlabs
        : cloneInitialState().bonusSlabs,
      businessmen: Array.isArray(parsed.businessmen)
        ? parsed.businessmen
        : cloneInitialState().businessmen,
      salesOrders: Array.isArray(parsed.salesOrders)
        ? parsed.salesOrders
        : cloneInitialState().salesOrders,
      advanceAllocations: Array.isArray(parsed.advanceAllocations)
        ? parsed.advanceAllocations
        : cloneInitialState().advanceAllocations,
    };
  } catch {
    return cloneInitialState();
  }
}

export function saveTradeState(
  state: TradeStoreState
): { ok: boolean; health: StorageHealth } {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      ok: false,
      health: inspectStorageHealth('Browser localStorage is unavailable in this environment.'),
    };
  }
  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return {
      ok: true,
      health: inspectStorageHealth(null),
    };
  } catch (err) {
    const message = isQuotaExceededError(err)
      ? 'LocalStorage is full! Unable to save new changes until storage is cleared.'
      : 'Failed to write data to browser localStorage.';
    return {
      ok: false,
      health: {
        ...inspectStorageHealth(message),
        isFull: isQuotaExceededError(err) ? true : inspectStorageHealth(message).isFull,
      },
    };
  }
}

export function resetTradeStoragePreservingDefaults(): {
  state: TradeStoreState;
  health: StorageHealth;
} {
  const baseline = cloneInitialState();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(baseline));
    } catch {
      // Ignore write error after clear
    }
  }
  return {
    state: baseline,
    health: inspectStorageHealth(null),
  };
}
