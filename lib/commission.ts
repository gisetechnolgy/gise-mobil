/**
 * Web `applyCommissionFee` ile aynı: isCommissionExtra ise birim fiyata % komisyon eklenir.
 */
export type CommissionMeta = {
  commissionFee?: number | null;
  isCommissionExtra?: boolean | null;
};

export function shouldApplyCommissionExtra(meta?: CommissionMeta | null): boolean {
  if (!meta?.isCommissionExtra) return false;
  const fee = Number(meta.commissionFee ?? 0);
  return Number.isFinite(fee) && fee > 0;
}

/** TL 2 hane (web formatMoney + removeComma). */
export function applyCommissionMarkup(
  price: number,
  meta?: CommissionMeta | null,
): number {
  const base = Number(price);
  if (!Number.isFinite(base)) return 0;
  if (!shouldApplyCommissionExtra(meta)) {
    return Math.round(base * 100) / 100;
  }
  const fee = Number(meta!.commissionFee);
  const marked = base * (1 + fee / 100);
  return Math.round(marked * 100) / 100;
}
