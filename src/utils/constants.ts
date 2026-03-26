/**
 * アプリケーション全体で使用する定数
 */

/** 在庫状態のラベルと色 */
export const STOCK_STATUS_CONFIG = {
  sufficient: {
    label: '十分',
    color: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
  low: {
    label: '少ない',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-300',
    dot: 'bg-yellow-500',
  },
  out: {
    label: 'なし',
    color: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
} as const;

/** 優先度のラベルと色 */
export const PRIORITY_CONFIG = {
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-100' },
  medium: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  low: { label: '低', color: 'text-gray-600', bg: 'bg-gray-100' },
} as const;

/** デフォルトの単位候補 */
export const DEFAULT_UNITS = [
  '個', '本', '袋', 'パック', '箱', '缶',
  'g', 'kg', 'ml', 'L', '枚', '巻', 'セット',
] as const;

/** デフォルトの保管場所候補 */
export const DEFAULT_STORAGE_LOCATIONS = [
  '冷蔵庫', '冷凍庫', '野菜室', 'パントリー',
  '食品棚', '洗面所', '浴室', '収納棚', 'その他',
] as const;

/** デフォルトの店舗タイプ */
export const DEFAULT_STORE_TYPES = [
  'スーパー', 'コンビニ', 'ドラッグストア', 'ホームセンター',
  '100円ショップ', 'ネット通販', 'その他',
] as const;

/** デフォルトカテゴリ（初期セットアップ用） */
export const DEFAULT_CATEGORIES = [
  { name: '野菜・果物', sort_order: 1 },
  { name: '肉・魚', sort_order: 2 },
  { name: '乳製品・卵', sort_order: 3 },
  { name: '調味料', sort_order: 4 },
  { name: '飲料', sort_order: 5 },
  { name: '冷凍食品', sort_order: 6 },
  { name: 'お菓子', sort_order: 7 },
  { name: '日用品', sort_order: 8 },
  { name: '洗剤・衛生用品', sort_order: 9 },
  { name: 'その他', sort_order: 10 },
] as const;

/** ページサイズ（一覧表示のデフォルト件数） */
export const PAGE_SIZE = 50;

/** 消費税率（10%） */
export const TAX_RATE = 0.1;

/** 税込価格から税抜価格を計算 */
export const calcPriceWithoutTax = (priceWithTax: number): number => {
  return Math.round(priceWithTax / (1 + TAX_RATE));
};

/** 税抜価格から税込価格を計算 */
export const calcPriceWithTax = (priceWithoutTax: number): number => {
  return Math.round(priceWithoutTax * (1 + TAX_RATE));
};
