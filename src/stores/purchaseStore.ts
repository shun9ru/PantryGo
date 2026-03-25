/**
 * 購入履歴管理ストア
 * 購入記録のCRUDと価格比較計算
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
  PurchaseHistoryWithDetails,
  PriceComparison,
  StorePriceInfo,
  Store,
} from '@/types/database';
import { calculateStockStatus } from '@/utils/helpers';

interface PurchaseState {
  /** 購入履歴一覧 */
  history: PurchaseHistoryWithDetails[];
  /** 店舗一覧 */
  stores: Store[];
  /** ローディング */
  loading: boolean;
  /** エラー */
  error: string | null;

  /** 購入履歴を取得 */
  fetchHistory: (householdId: string) => Promise<void>;
  /** 店舗一覧を取得 */
  fetchStores: (householdId: string) => Promise<void>;
  /** 購入を記録（在庫反映込み） */
  recordPurchase: (data: {
    household_id: string;
    product_id: string;
    store_id: string | null;
    store_name: string | null;
    purchase_date: string;
    price: number;
    quantity: number;
    is_sale: boolean;
    memo: string | null;
    created_by: string | null;
    min_stock_threshold: number;
  }) => Promise<{ success: boolean; error: string | null }>;
  /** 店舗を追加 */
  addStore: (householdId: string, name: string, storeType: string | null) => Promise<{ id: string | null }>;
  /** 商品の価格比較を計算 */
  getPriceComparison: (productId: string) => Promise<PriceComparison | null>;
  /** 最近の購入履歴を取得（件数指定） */
  getRecentHistory: (count: number) => PurchaseHistoryWithDetails[];
  /** 店舗を削除 */
  deleteStore: (storeId: string) => Promise<{ success: boolean }>;
  /** 店舗の表示順を一括保存 */
  reorderStores: (householdId: string, orderedIds: string[]) => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  history: [],
  stores: [],
  loading: false,
  error: null,

  fetchHistory: async (householdId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('purchase_history')
      .select('*, product:products(*), store:stores(*)')
      .eq('household_id', householdId)
      .order('purchase_date', { ascending: false })
      .limit(200);

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ history: data as PurchaseHistoryWithDetails[], loading: false });
    }
  },

  fetchStores: async (householdId) => {
    const { data } = await supabase
      .from('stores')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
      .order('name');

    if (data) {
      set({ stores: data });
    }
  },

  recordPurchase: async (data) => {
    // 店舗名が指定されていてstore_idがない場合、新規店舗を作成
    let storeId = data.store_id;
    if (!storeId && data.store_name) {
      const result = await get().addStore(data.household_id, data.store_name, null);
      storeId = result.id;
    }

    // 購入履歴を追加
    const { error: purchaseError } = await supabase
      .from('purchase_history')
      .insert({
        household_id: data.household_id,
        product_id: data.product_id,
        store_id: storeId,
        purchase_date: data.purchase_date,
        price: data.price,
        quantity: data.quantity,
        is_sale: data.is_sale,
        memo: data.memo || null,
        created_by: data.created_by,
      });

    if (purchaseError) {
      return { success: false, error: purchaseError.message };
    }

    // 在庫を加算更新
    const { data: currentInventory } = await supabase
      .from('inventory')
      .select('current_quantity')
      .eq('product_id', data.product_id)
      .single();

    if (currentInventory) {
      const newQuantity = currentInventory.current_quantity + data.quantity;
      const stockStatus = calculateStockStatus(newQuantity, data.min_stock_threshold);

      await supabase
        .from('inventory')
        .update({
          current_quantity: newQuantity,
          stock_status: stockStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', data.product_id);
    }

    // ストアデータを再取得
    await get().fetchHistory(data.household_id);
    await get().fetchStores(data.household_id);

    return { success: true, error: null };
  },

  addStore: async (householdId, name, storeType) => {
    // 既存の同名店舗を検索
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('household_id', householdId)
      .eq('name', name)
      .limit(1);

    if (existing && existing.length > 0) {
      return { id: existing[0].id };
    }

    const { data, error } = await supabase
      .from('stores')
      .insert({ household_id: householdId, name, store_type: storeType })
      .select()
      .single();

    return { id: error ? null : data.id };
  },

  getPriceComparison: async (productId) => {
    const { data: records } = await supabase
      .from('purchase_history')
      .select('*, store:stores(*)')
      .eq('product_id', productId)
      .order('purchase_date', { ascending: false });

    if (!records || records.length === 0) return null;

    // 店舗別に価格情報を集計
    const storeMap = new Map<string, {
      store_id: string;
      store_name: string;
      prices: number[];
      dates: string[];
    }>();

    for (const r of records) {
      const sid = r.store_id ?? 'unknown';
      const sname = r.store?.name ?? '不明';
      if (!storeMap.has(sid)) {
        storeMap.set(sid, { store_id: sid, store_name: sname, prices: [], dates: [] });
      }
      const entry = storeMap.get(sid)!;
      entry.prices.push(r.price);
      entry.dates.push(r.purchase_date);
    }

    const stores: StorePriceInfo[] = Array.from(storeMap.values()).map((s) => ({
      store_id: s.store_id,
      store_name: s.store_name,
      min_price: Math.min(...s.prices),
      max_price: Math.max(...s.prices),
      avg_price: Math.round(s.prices.reduce((a, b) => a + b, 0) / s.prices.length),
      latest_price: s.prices[0],
      latest_date: s.dates[0],
      purchase_count: s.prices.length,
    }));

    const allPrices = records.map((r) => r.price);
    const cheapestStore = stores.reduce((min, s) =>
      s.min_price < min.min_price ? s : min
    );

    return {
      product_id: productId,
      cheapest_store: cheapestStore.store_name,
      cheapest_price: cheapestStore.min_price,
      latest_price: allPrices[0],
      average_price: Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length),
      stores,
    };
  },

  getRecentHistory: (count) => {
    return get().history.slice(0, count);
  },

  deleteStore: async (storeId) => {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    return { success: !error };
  },

  reorderStores: async (householdId, orderedIds) => {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('stores')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );
    await Promise.all(updates);
    await get().fetchStores(householdId);
  },
}));
