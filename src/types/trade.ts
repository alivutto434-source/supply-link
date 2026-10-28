export interface BonusSlab {
  id: string;
  plusPercentage: number;
  range: {
    min: number;
    max: number;
  };
}

export interface SupplierRecord {
  id: string;
  name: string;
  addedAt: string;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitPrice: number;
  source: 'dealer' | 'supplier_custom';
  createdAt: string;
}

export interface BusinessmanRecord {
  id: string;
  shopName: string;
  area: string;
  addedAt: string;
}

export interface SaleOrderItem {
  productId: string;
  productName: string;
  productSource: 'dealer' | 'supplier_custom';
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface SaleOrder {
  id: string;
  businessmanId: string;
  businessmanName: string;
  items: SaleOrderItem[];
  totalQuantity: number;
  totalAmount: number;
  createdAt: string;
}

export interface AdvanceOrderItem {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineGrossAmount: number;
}

export interface AdvanceAllocation {
  id: string;
  supplierId: string;
  supplierName: string;
  items: AdvanceOrderItem[];
  totalQuantity: number;
  appliedDiscountPercentage: number;
  grossAmount: number;
  netPayableAmount: number;
  note: string;
  status: 'pending' | 'settled';
  createdAt: string;
  settledAt?: string;
}

export interface TradeStoreState {
  dealerName: string;
  baseDiscountPercentage: number;
  suppliers: SupplierRecord[];
  products: ProductItem[];
  bonusSlabs: BonusSlab[];
  businessmen: BusinessmanRecord[];
  salesOrders: SaleOrder[];
  advanceAllocations: AdvanceAllocation[];
}

export interface StorageHealth {
  usedBytes: number;
  maxBytes: number;
  usagePercent: number;
  isNearFull: boolean;
  isFull: boolean;
  errorMessage: string | null;
}

export interface BonusEligibilityResult {
  baseDiscount: number;
  eligibleSlab: BonusSlab | null;
  plusPercentage: number;
  totalDiscount: number;
  exceededTopSlab: boolean;
  nextSlab: BonusSlab | null;
  amountToNextSlab: number;
}
