import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  AdvanceAllocation,
  AdvanceOrderItem,
  BonusEligibilityResult,
  BonusSlab,
  BusinessmanRecord,
  ProductItem,
  SaleOrder,
  SaleOrderItem,
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

export interface OrderLineInput {
  productId: string;
  quantity: number;
}

interface TradeContextValue {
  state: TradeStoreState;
  storageHealth: StorageHealth;
  totalSellAmount: number;
  bonusEligibility: BonusEligibilityResult;
  businessmanLeaderboard: BusinessmanSpendSummary[];
  pendingAdvanceTotal: number;
  updateBaseDiscount: (newBasePercent: number) => boolean;
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
    supplierIds: string[];
    items: OrderLineInput[];
    note?: string;
  }) => boolean;
  settleAdvanceAllocation: (id: string) => boolean;
  addBusinessman: (shopName: string, area?: string) => BusinessmanRecord | null;
  createSaleOrder: (input: {
    businessmanId: string;
    items: OrderLineInput[];
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

  const updateBaseDiscount = useCallback(
    (newBasePercent: number): boolean => {
      if (Number.isNaN(newBasePercent) || newBasePercent < 0 || newBasePercent > 95) {
        return false;
      }
      const normalized = Number(newBasePercent.toFixed(2));
      return persistUpdate((prev) => ({
        ...prev,
        baseDiscountPercentage: normalized,
      }));
    },
    [persistUpdate]
  );

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
      supplierIds: string[];
      items: OrderLineInput[];
      note?: string;
    }): boolean => {
      const current = stateRef.current;
      const uniqueSupplierIds = Array.from(new Set(input.supplierIds));
      const selectedSuppliers = uniqueSupplierIds
        .map((id) => current.suppliers.find((s) => s.id === id))
        .filter((s): s is SupplierRecord => Boolean(s));

      if (selectedSuppliers.length === 0) return false;

      // Merge quantities if the same product was added in multiple rows
      const qtyByProduct = new Map<string, number>();
      for (const line of input.items) {
        if (!line.productId || !line.quantity || line.quantity <= 0) continue;
        qtyByProduct.set(
          line.productId,
          (qtyByProduct.get(line.productId) ?? 0) + Math.round(line.quantity)
        );
      }

      const builtItems: AdvanceOrderItem[] = [];
      for (const [productId, quantity] of qtyByProduct.entries()) {
        const product = current.products.find(
          (p) => p.id === productId && p.source === 'dealer'
        );
        if (!product) continue;
        builtItems.push({
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          unitPrice: product.unitPrice,
          quantity,
          lineGrossAmount: product.unitPrice * quantity,
        });
      }

      if (builtItems.length === 0) return false;

      const grossAmount = builtItems.reduce((sum, i) => sum + i.lineGrossAmount, 0);
      const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
      const discountMultiplier = (100 - current.baseDiscountPercentage) / 100;
      const netPayableAmount = Math.round(grossAmount * discountMultiplier);
      const nowIso = new Date().toISOString();

      const newAllocations: AdvanceAllocation[] = selectedSuppliers.map((supplier) => ({
        id: makeId('adv'),
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: builtItems.map((item) => ({ ...item })),
        totalQuantity,
        appliedDiscountPercentage: current.baseDiscountPercentage,
        grossAmount,
        netPayableAmount,
        note: input.note?.trim() || 'Advance stock allocation — payment deferred',
        status: 'pending',
        createdAt: nowIso,
      }));

      return persistUpdate((prev) => ({
        ...prev,
        advanceAllocations: [...newAllocations, ...prev.advanceAllocations],
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
    (input: { businessmanId: string; items: OrderLineInput[] }): boolean => {
      const current = stateRef.current;
      const shop = current.businessmen.find((b) => b.id === input.businessmanId);
      if (!shop) return false;

      // Consolidate duplicate items in the same order
      const qtyByProduct = new Map<string, number>();
      for (const line of input.items) {
        if (!line.productId || !line.quantity || line.quantity <= 0) continue;
        qtyByProduct.set(
          line.productId,
          (qtyByProduct.get(line.productId) ?? 0) + Math.round(line.quantity)
        );
      }

      const builtItems: SaleOrderItem[] = [];
      for (const [productId, quantity] of qtyByProduct.entries()) {
        const product = current.products.find((p) => p.id === productId);
        if (!product) continue;
        builtItems.push({
          productId: product.id,
          productName: product.name,
          productSource: product.source,
          unit: product.unit,
          unitPrice: product.unitPrice,
          quantity,
          lineTotal: product.unitPrice * quantity,
        });
      }

      if (builtItems.length === 0) return false;

      const totalQuantity = builtItems.reduce((sum, i) => sum + i.quantity, 0);
      const totalAmount = builtItems.reduce((sum, i) => sum + i.lineTotal, 0);

      const order: SaleOrder = {
        id: makeId('ord'),
        businessmanId: shop.id,
        businessmanName: shop.shopName,
        items: builtItems,
        totalQuantity,
        totalAmount,
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
        entry.totalUnits += order.totalQuantity;
        if (!entry.lastOrderAt || order.createdAt > entry.lastOrderAt) {
          entry.lastOrderAt = order.createdAt;
          if (order.items.length === 1) {
            entry.lastProductName = order.items[0].productName;
          } else if (order.items.length > 1) {
            entry.lastProductName = `${order.items[0].productName} +${order.items.length - 1} more`;
          }
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
      updateBaseDiscount,
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
      updateBaseDiscount,
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
