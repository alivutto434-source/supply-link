import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  AdvanceAllocation,
  BonusEligibilityResult,
  BonusSlab,
  BusinessmanRecord,
  ProductItem,
  SaleOrder,
  StorageHealth,
  SupplierRecord,
  TradeStoreState,
} from '../types/trade';
import {
  inspectStorageHealth,
  loadTradeState,
  resetTradeStoragePreservingDefaults,
  saveTradeState,
} from '../utils/storage';
import { evaluateMonthlyBonus } from '../utils/format';

export interface BusinessmanSpendSummary {
  businessman: BusinessmanRecord;
  totalSpend: number;
  orderCount: number;
  totalUnits: number;
  lastOrderAt: string | null;
  lastProductName: string | null;
}

interface TradeContextValue {
  state: TradeStoreState;
  storageHealth: StorageHealth;
  totalSellAmount: number;
  bonusEligibility: BonusEligibilityResult;
  businessmanLeaderboard: BusinessmanSpendSummary[];
  pendingAdvanceTotal: number;
  addSupplier: (name: string) => boolean;
  addDealerProduct: (input: {
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
  }) => boolean;
  addSupplierCustomProduct: (input: {
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
  }) => boolean;
  addBonusSlab: (input: { plusPercentage: number; min: number; max: number }) => boolean;
  deleteBonusSlab: (id: string) => boolean;
  issueAdvanceProduct: (input: {
    supplierId: string;
    productId: string;
    quantity: number;
    note?: string;
  }) => boolean;
  settleAdvanceAllocation: (id: string) => boolean;
  addBusinessman: (shopName: string, area?: string) => BusinessmanRecord | null;
  createSaleOrder: (input: {
    businessmanId: string;
    productId: string;
    quantity: number;
  }) => boolean;
  clearStorageKeepBaseline: () => void;
  refreshStorageCheck: () => void;
}

const TradeContext = createContext<TradeContextValue | undefined>(undefined);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const TradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TradeStoreState>(() => loadTradeState());
  const stateRef = useRef<TradeStoreState>(state);
  stateRef.current = state;

  const [storageHealth, setStorageHealth] = useState<StorageHealth>(() => inspectStorageHealth());

  const persistUpdate = useCallback(
    (updater: (prev: TradeStoreState) => TradeStoreState): boolean => {
      const next = updater(stateRef.current);
      const result = saveTradeState(next);
      setStorageHealth(result.health);
      if (!result.ok) {
        message.error(
          result.health.errorMessage ||
            'Browser localStorage is full. Clear storage before adding more records.'
        );
        return false;
      }
      stateRef.current = next;
      setState(next);
      return true;
    },
    []
  );

  const refreshStorageCheck = useCallback(() => {
    setStorageHealth(inspectStorageHealth());
  }, []);

  const addSupplier = useCallback(
    (rawName: string): boolean => {
      const trimmed = rawName.trim();
      if (!trimmed) return false;
      const newSupplier: SupplierRecord = {
        id: makeId('sup'),
        name: trimmed,
        addedAt: new Date().toISOString(),
      };
      return persistUpdate((prev) => ({
        ...prev,
        suppliers: [newSupplier, ...prev.suppliers],
      }));
    },
    [persistUpdate]
  );

  const addDealerProduct = useCallback(
    (input: { name: string; category: string; unit: string; unitPrice: number }): boolean => {
      const current = stateRef.current;
      const nextNum = current.products.filter((p) => p.source === 'dealer').length + 101;
      const item: ProductItem = {
        id: makeId('prd'),
        name: input.name.trim(),
        sku: `JND-${nextNum}`,
        category: input.category.trim() || 'General',
        unit: input.unit.trim() || 'Carton',
        unitPrice: Math.round(input.unitPrice),
        source: 'dealer',
        createdAt: new Date().toISOString(),
      };
      return persistUpdate((prev) => ({
        ...prev,
        products: [item, ...prev.products],
      }));
    },
    [persistUpdate]
  );

  const addSupplierCustomProduct = useCallback(
    (input: { name: string; category: string; unit: string; unitPrice: number }): boolean => {
      const current = stateRef.current;
      const nextNum = current.products.filter((p) => p.source === 'supplier_custom').length + 901;
      const item: ProductItem = {
        id: makeId('prd'),
        name: input.name.trim(),
        sku: `SUP-${nextNum}`,
        category: input.category.trim() || 'Custom',
        unit: input.unit.trim() || 'Unit',
        unitPrice: Math.round(input.unitPrice),
        source: 'supplier_custom',
        createdAt: new Date().toISOString(),
      };
      return persistUpdate((prev) => ({
        ...prev,
        products: [item, ...prev.products],
      }));
    },
    [persistUpdate]
  );

  const addBonusSlab = useCallback(
    (input: { plusPercentage: number; min: number; max: number }): boolean => {
      const newSlab: BonusSlab = {
        id: makeId('slab'),
        plusPercentage: Number(input.plusPercentage),
        range: {
          min: Math.round(input.min),
          max: Math.round(input.max),
        },
      };
      return persistUpdate((prev) => ({
        ...prev,
        bonusSlabs: [...prev.bonusSlabs, newSlab].sort((a, b) => a.range.min - b.range.min),
      }));
    },
    [persistUpdate]
  );

  const deleteBonusSlab = useCallback(
    (id: string): boolean => {
      return persistUpdate((prev) => ({
        ...prev,
        bonusSlabs: prev.bonusSlabs.filter((s) => s.id !== id),
      }));
    },
    [persistUpdate]
  );

  const issueAdvanceProduct = useCallback(
    (input: {
      supplierId: string;
      productId: string;
      quantity: number;
      note?: string;
    }): boolean => {
      const current = stateRef.current;
      const supplier = current.suppliers.find((s) => s.id === input.supplierId);
      const product = current.products.find(
        (p) => p.id === input.productId && p.source === 'dealer'
      );
      if (!supplier || !product || input.quantity <= 0) return false;

      const grossAmount = product.unitPrice * input.quantity;
      const discountMultiplier = (100 - current.baseDiscountPercentage) / 100;
      const netPayableAmount = Math.round(grossAmount * discountMultiplier);

      const allocation: AdvanceAllocation = {
        id: makeId('adv'),
        supplierId: supplier.id,
        supplierName: supplier.name,
        productId: product.id,
        productName: product.name,
        quantity: input.quantity,
        unitPrice: product.unitPrice,
        grossAmount,
        netPayableAmount,
        note: input.note?.trim() || 'Advance stock allocation — payment deferred',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      return persistUpdate((prev) => ({
        ...prev,
        advanceAllocations: [allocation, ...prev.advanceAllocations],
      }));
    },
    [persistUpdate]
  );

  const settleAdvanceAllocation = useCallback(
    (id: string): boolean => {
      return persistUpdate((prev) => ({
        ...prev,
        advanceAllocations: prev.advanceAllocations.map((item) =>
          item.id === id
            ? { ...item, status: 'settled', settledAt: new Date().toISOString() }
            : item
        ),
      }));
    },
    [persistUpdate]
  );

  const addBusinessman = useCallback(
    (shopName: string, area?: string): BusinessmanRecord | null => {
      const trimmed = shopName.trim();
      if (!trimmed) return null;
      const newShop: BusinessmanRecord = {
        id: makeId('biz'),
        shopName: trimmed,
        area: area?.trim() || 'Dhaka Metropolitan',
        addedAt: new Date().toISOString(),
      };
      const ok = persistUpdate((prev) => ({
        ...prev,
        businessmen: [newShop, ...prev.businessmen],
      }));
      return ok ? newShop : null;
    },
    [persistUpdate]
  );

  const createSaleOrder = useCallback(
    (input: { businessmanId: string; productId: string; quantity: number }): boolean => {
      const current = stateRef.current;
      const shop = current.businessmen.find((b) => b.id === input.businessmanId);
      const product = current.products.find((p) => p.id === input.productId);
      if (!shop || !product || input.quantity <= 0) return false;

      const qty = Math.round(input.quantity);
      const order: SaleOrder = {
        id: makeId('ord'),
        businessmanId: shop.id,
        businessmanName: shop.shopName,
        productId: product.id,
        productName: product.name,
        productSource: product.source,
        unitPrice: product.unitPrice,
        quantity: qty,
        totalAmount: product.unitPrice * qty,
        createdAt: new Date().toISOString(),
      };

      return persistUpdate((prev) => ({
        ...prev,
        salesOrders: [order, ...prev.salesOrders],
      }));
    },
    [persistUpdate]
  );

  const clearStorageKeepBaseline = useCallback(() => {
    const { state: baseline, health } = resetTradeStoragePreservingDefaults();
    stateRef.current = baseline;
    setState(baseline);
    setStorageHealth(health);
    message.success('Local storage cleared. Default catalog, dealer, and shop records restored.');
  }, []);

  const totalSellAmount = useMemo(
    () => state.salesOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    [state.salesOrders]
  );

  const bonusEligibility = useMemo(
    () =>
      evaluateMonthlyBonus(
        totalSellAmount,
        state.baseDiscountPercentage,
        state.bonusSlabs
      ),
    [state.baseDiscountPercentage, state.bonusSlabs, totalSellAmount]
  );

  const businessmanLeaderboard = useMemo<BusinessmanSpendSummary[]>(() => {
    const map = new Map<string, BusinessmanSpendSummary>();

    for (const biz of state.businessmen) {
      map.set(biz.id, {
        businessman: biz,
        totalSpend: 0,
        orderCount: 0,
        totalUnits: 0,
        lastOrderAt: null,
        lastProductName: null,
      });
    }

    for (const order of state.salesOrders) {
      const entry = map.get(order.businessmanId);
      if (entry) {
        entry.totalSpend += order.totalAmount;
        entry.orderCount += 1;
        entry.totalUnits += order.quantity;
        if (!entry.lastOrderAt || order.createdAt > entry.lastOrderAt) {
          entry.lastOrderAt = order.createdAt;
          entry.lastProductName = order.productName;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [state.businessmen, state.salesOrders]);

  const pendingAdvanceTotal = useMemo(
    () =>
      state.advanceAllocations
        .filter((a) => a.status === 'pending')
        .reduce((sum, a) => sum + a.netPayableAmount, 0),
    [state.advanceAllocations]
  );

  const value = useMemo<TradeContextValue>(
    () => ({
      state,
      storageHealth,
      totalSellAmount,
      bonusEligibility,
      businessmanLeaderboard,
      pendingAdvanceTotal,
      addSupplier,
      addDealerProduct,
      addSupplierCustomProduct,
      addBonusSlab,
      deleteBonusSlab,
      issueAdvanceProduct,
      settleAdvanceAllocation,
      addBusinessman,
      createSaleOrder,
      clearStorageKeepBaseline,
      refreshStorageCheck,
    }),
    [
      state,
      storageHealth,
      totalSellAmount,
      bonusEligibility,
      businessmanLeaderboard,
      pendingAdvanceTotal,
      addSupplier,
      addDealerProduct,
      addSupplierCustomProduct,
      addBonusSlab,
      deleteBonusSlab,
      issueAdvanceProduct,
      settleAdvanceAllocation,
      addBusinessman,
      createSaleOrder,
      clearStorageKeepBaseline,
      refreshStorageCheck,
    ]
  );

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
};

export function useTrade(): TradeContextValue {
  const ctx = useContext(TradeContext);
  if (!ctx) {
    throw new Error('useTrade must be used inside TradeProvider');
  }
  return ctx;
}
