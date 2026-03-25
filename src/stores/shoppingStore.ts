/**
 * 買い物リスト管理ストア
 * 買い物リストの追加・更新・購入完了処理
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
  ShoppingListItem,
  ShoppingListItemWithDetails,
  ShoppingPriority,
} from '@/types/database';

interface ShoppingState {
  /** 買い物リスト */
  items: ShoppingListItemWithDetails[];
  /** ローディング */
  loading: boolean;
  /** エラー */
  error: string | null;

  /** 買い物リストを取得 */
  fetchItems: (householdId: string) => Promise<void>;
  /** 買い物リストに追加（重複チェック付き） */
  addItem: (data: {
    household_id: string;
    product_id: string | null;
    item_name: string;
    planned_store_id: string | null;
    priority: ShoppingPriority;
    memo: string | null;
    added_by: string | null;
  }) => Promise<{ success: boolean; error: string | null }>;
  /** 手動で買い物リストに追加 */
  addManualItem: (data: {
    household_id: string;
    item_name: string;
    priority: ShoppingPriority;
    memo: string | null;
    added_by: string | null;
  }) => Promise<{ success: boolean }>;
  /** 買い物リストアイテムを更新 */
  updateItem: (itemId: string, data: Partial<ShoppingListItem>) => Promise<void>;
  /** 購入済みにマーク */
  markAsPurchased: (itemId: string, purchasedBy: string | null) => Promise<void>;
  /** アイテムを削除 */
  deleteItem: (itemId: string) => Promise<void>;
  /** 未購入件数を取得 */
  getPendingCount: () => number;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async (householdId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('shopping_list')
      .select('*, product:products(*), planned_store:stores(*)')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ items: data as ShoppingListItemWithDetails[], loading: false });
    }
  },

  addItem: async (data) => {
    /**
     * 重複登録の防止方針:
     * 同一商品(product_id)が未購入状態で既に存在する場合は追加しない。
     * 手動追加(product_idなし)の場合は同一名称でも追加可能とする。
     * → 理由: 数量加算方式だと在庫との整合が複雑になるため、
     *   シンプルに重複ブロックを採用。ユーザーには通知で知らせる。
     */
    if (data.product_id) {
      const { data: existing } = await supabase
        .from('shopping_list')
        .select('id')
        .eq('household_id', data.household_id)
        .eq('product_id', data.product_id)
        .eq('status', 'pending')
        .limit(1);

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: 'この商品は既に買い物リストに追加されています',
        };
      }
    }

    const { error } = await supabase.from('shopping_list').insert({
      household_id: data.household_id,
      product_id: data.product_id,
      item_name: data.item_name,
      planned_store_id: data.planned_store_id,
      priority: data.priority,
      memo: data.memo,
      added_by: data.added_by,
      status: 'pending',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await get().fetchItems(data.household_id);
    return { success: true, error: null };
  },

  addManualItem: async (data) => {
    const { error } = await supabase.from('shopping_list').insert({
      household_id: data.household_id,
      item_name: data.item_name,
      priority: data.priority,
      memo: data.memo,
      added_by: data.added_by,
      status: 'pending',
    });

    if (!error) {
      await get().fetchItems(data.household_id);
    }
    return { success: !error };
  },

  updateItem: async (itemId, data) => {
    await supabase
      .from('shopping_list')
      .update(data)
      .eq('id', itemId);
  },

  markAsPurchased: async (itemId, purchasedBy) => {
    await supabase
      .from('shopping_list')
      .update({
        status: 'purchased',
        purchased_by: purchasedBy,
        purchased_at: new Date().toISOString(),
      })
      .eq('id', itemId);
  },

  deleteItem: async (itemId) => {
    await supabase
      .from('shopping_list')
      .delete()
      .eq('id', itemId);
  },

  getPendingCount: () => {
    return get().items.filter((item) => item.status === 'pending').length;
  },
}));
