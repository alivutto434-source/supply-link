import { BonusEligibilityResult, BonusSlab } from '../types/trade';

const bdtFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function formatBDT(amount: number): string {
  return `৳ ${bdtFormatter.format(Math.round(amount))}`;
}

export function formatNumberBD(amount: number): string {
  return bdtFormatter.format(Math.round(amount));
}

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1).replace(/\.0$/, '')}%`;
}

export function evaluateMonthlyBonus(
  totalSellAmount: number,
  baseDiscount: number,
  slabs: BonusSlab[]
): BonusEligibilityResult {
  const sorted = [...slabs].sort((a, b) => a.range.min - b.range.min);

  let eligibleSlab: BonusSlab | null = null;
  let exceededTopSlab = false;

  for (const slab of sorted) {
    if (totalSellAmount >= slab.range.min && totalSellAmount <= slab.range.max) {
      eligibleSlab = slab;
      break;
    }
  }

  // If sales surpass the highest configured slab maximum, retain the highest achieved slab benefit
  if (!eligibleSlab && sorted.length > 0) {
    const topSlab = sorted[sorted.length - 1];
    if (totalSellAmount > topSlab.range.max) {
      eligibleSlab = topSlab;
      exceededTopSlab = true;
    } else {
      // Handle potential gaps between custom slabs by picking highest slab whose min is met
      const passedSlabs = sorted.filter((s) => totalSellAmount >= s.range.min);
      if (passedSlabs.length > 0) {
        eligibleSlab = passedSlabs[passedSlabs.length - 1];
      }
    }
  }

  const plusPercentage = eligibleSlab ? eligibleSlab.plusPercentage : 0;
  const totalDiscount = Number((baseDiscount + plusPercentage).toFixed(2));

  const nextSlab = sorted.find((s) => s.range.min > totalSellAmount) ?? null;
  const amountToNextSlab = nextSlab ? Math.max(0, nextSlab.range.min - totalSellAmount) : 0;

  return {
    baseDiscount,
    eligibleSlab,
    plusPercentage,
    totalDiscount,
    exceededTopSlab,
    nextSlab,
    amountToNextSlab,
  };
}
