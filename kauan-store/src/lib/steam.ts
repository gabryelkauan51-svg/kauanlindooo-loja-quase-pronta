/** Margem aplicada aos produtos Steam (itens e keys). */
export const STEAM_MARGIN_PERCENT = 70;

/** Preço base do fornecedor a partir do qual cada linha de produto começa. */
export const STEAM_BASE_FROM = { item: 10, key: 0.3 } as const;

/** preço × (1 + 70%), arredondado para 2 casas. */
export function steamPrice(supplierPrice: number): number {
  return Math.round((supplierPrice * (1 + STEAM_MARGIN_PERCENT / 100) + Number.EPSILON) * 100) / 100;
}
