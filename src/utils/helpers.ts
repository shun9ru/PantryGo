/**
 * ユーティリティ関数
 */
import type { StockStatus } from '@/types/database';

/**
 * 在庫状態を判定する
 * - 数量 > 閾値 → 十分(sufficient)
 * - 数量 >= 1 かつ 数量 <= 閾値 → 少ない(low)
 * - 数量 === 0 → なし(out)
 */
export function calculateStockStatus(
  currentQuantity: number,
  minStockThreshold: number
): StockStatus {
  if (currentQuantity <= 0) return 'out';
  if (currentQuantity <= minStockThreshold) return 'low';
  return 'sufficient';
}

/**
 * 日付を「YYYY-MM-DD」形式にフォーマット
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 日付を「M/D」形式の短縮フォーマット
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 価格を日本円表記にフォーマット
 */
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString('ja-JP')}`;
}

/**
 * 今日の日付をYYYY-MM-DD形式で返す
 */
export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 文字列が空かどうかチェック
 */
export function isEmpty(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * classNameを結合するヘルパー (falsy値をフィルタ)
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
