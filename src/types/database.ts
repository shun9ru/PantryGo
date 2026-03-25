/**
 * Supabaseデータベースの型定義
 * テーブル構造に対応するTypeScript型を定義
 */

// ============================================================
// ユーザー・世帯関連
// ============================================================

/** ユーザー */
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

/** 世帯（家族共有の単位） */
export interface Household {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

/** 世帯メンバー */
export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

// ============================================================
// マスタデータ
// ============================================================

/** カテゴリ（食品、日用品など） */
export interface Category {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
}

/** 単位 */
export interface Unit {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
}

/** 保管場所 */
export interface StorageLocation {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
}

/** 店舗 */
export interface Store {
  id: string;
  household_id: string;
  name: string;
  store_type: string | null;
}

// ============================================================
// 商品・在庫
// ============================================================

/** 商品 */
export interface Product {
  id: string;
  household_id: string;
  category_id: string | null;
  name: string;
  brand: string | null;
  unit: string;
  barcode: string | null;
  storage_location: string | null;
  is_expiry_managed: boolean;
  min_stock_threshold: number;
  is_active: boolean;
  created_at: string;
}

/** 商品（カテゴリ名付き） */
export interface ProductWithCategory extends Product {
  category: Category | null;
}

/** 在庫 */
export interface Inventory {
  id: string;
  product_id: string;
  current_quantity: number;
  stock_status: StockStatus;
  updated_at: string;
}

/** 在庫状態 */
export type StockStatus = 'sufficient' | 'low' | 'out';

/** 在庫（商品情報付き） */
export interface InventoryWithProduct extends Inventory {
  product: ProductWithCategory;
}

// ============================================================
// 買い物リスト
// ============================================================

/** 買い物リスト優先度 */
export type ShoppingPriority = 'high' | 'medium' | 'low';

/** 買い物リストの状態 */
export type ShoppingStatus = 'pending' | 'purchased';

/** 買い物リストアイテム */
export interface ShoppingListItem {
  id: string;
  household_id: string;
  product_id: string | null;
  item_name: string;
  planned_store_id: string | null;
  priority: ShoppingPriority;
  memo: string | null;
  status: ShoppingStatus;
  added_by: string | null;
  purchased_by: string | null;
  created_at: string;
  purchased_at: string | null;
}

/** 買い物リストアイテム（関連情報付き） */
export interface ShoppingListItemWithDetails extends ShoppingListItem {
  product: Product | null;
  planned_store: Store | null;
}

// ============================================================
// 購入履歴
// ============================================================

/** 購入履歴 */
export interface PurchaseHistory {
  id: string;
  household_id: string;
  product_id: string;
  store_id: string | null;
  purchase_date: string;
  price: number;
  quantity: number;
  unit_price: number;
  is_sale: boolean;
  memo: string | null;
  created_by: string | null;
  created_at: string;
}

/** 購入履歴（関連情報付き） */
export interface PurchaseHistoryWithDetails extends PurchaseHistory {
  product: Product;
  store: Store | null;
}

// ============================================================
// 価格比較
// ============================================================

/** 店舗別価格情報 */
export interface StorePriceInfo {
  store_id: string;
  store_name: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  latest_price: number;
  latest_date: string;
  purchase_count: number;
}

/** 商品の価格比較サマリ */
export interface PriceComparison {
  product_id: string;
  cheapest_store: string;
  cheapest_price: number;
  latest_price: number;
  average_price: number;
  stores: StorePriceInfo[];
}

// ============================================================
// 設定
// ============================================================

/** ユーザー設定 */
export interface UserSettings {
  id: string;
  user_id: string;
  low_stock_notify: boolean;
  expiry_notify: boolean;
  reminder_notify: boolean;
}

// ============================================================
// フォーム用の型
// ============================================================

/** 商品登録フォーム */
export interface ProductFormData {
  name: string;
  category_id: string;
  unit: string;
  brand: string;
  storage_location: string;
  min_stock_threshold: number;
  is_expiry_managed: boolean;
  initial_quantity: number;
}

/** 購入登録フォーム */
export interface PurchaseFormData {
  product_id: string;
  store_id: string;
  store_name: string;
  purchase_date: string;
  price: number;
  quantity: number;
  is_sale: boolean;
  memo: string;
}

/** 買い物リスト追加フォーム */
export interface ShoppingListFormData {
  product_id: string;
  item_name: string;
  planned_store_id: string;
  priority: ShoppingPriority;
  memo: string;
}
