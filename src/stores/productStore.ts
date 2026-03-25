/**
 * 商品管理ストア
 * 商品のCRUD操作と在庫の取得・更新
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type {
  ProductWithCategory,
  Category,
  StorageLocation,
  Unit,
  InventoryWithProduct,
} from '@/types/database';
import { calculateStockStatus } from '@/utils/helpers';

interface ProductState {
  /** 商品一覧 */
  products: ProductWithCategory[];
  /** 在庫一覧（商品情報付き） */
  inventoryItems: InventoryWithProduct[];
  /** カテゴリ一覧 */
  categories: Category[];
  /** 保管場所一覧 */
  storageLocations: StorageLocation[];
  /** 単位一覧 */
  units: Unit[];
  /** ローディング状態 */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;

  /** 商品一覧を取得 */
  fetchProducts: (householdId: string) => Promise<void>;
  /** 在庫一覧を取得 */
  fetchInventory: (householdId: string) => Promise<void>;
  /** カテゴリ一覧を取得 */
  fetchCategories: (householdId: string) => Promise<void>;
  /** 商品を追加 */
  addProduct: (householdId: string, data: {
    name: string;
    category_id: string | null;
    unit: string;
    brand: string | null;
    storage_location: string | null;
    min_stock_threshold: number;
    is_expiry_managed: boolean;
    initial_quantity: number;
  }) => Promise<{ success: boolean; error: string | null }>;
  /** 商品を更新 */
  updateProduct: (productId: string, data: Partial<ProductWithCategory>) => Promise<{ success: boolean }>;
  /** 在庫数を更新 */
  updateInventoryQuantity: (productId: string, newQuantity: number, minThreshold: number) => Promise<void>;
  /** カテゴリを追加 */
  addCategory: (householdId: string, name: string, sortOrder: number) => Promise<{ success: boolean }>;
  /** カテゴリを削除 */
  deleteCategory: (categoryId: string) => Promise<{ success: boolean }>;
  /** カテゴリの表示順を入れ替え */
  swapCategoryOrder: (householdId: string, categoryId: string, direction: 'up' | 'down') => Promise<void>;
  /** カテゴリの表示順を一括保存 */
  reorderCategories: (householdId: string, orderedIds: string[]) => Promise<void>;
  /** 保管場所一覧を取得 */
  fetchStorageLocations: (householdId: string) => Promise<void>;
  /** 保管場所を追加 */
  addStorageLocation: (householdId: string, name: string, sortOrder: number) => Promise<{ success: boolean }>;
  /** 保管場所を削除 */
  deleteStorageLocation: (locationId: string) => Promise<{ success: boolean }>;
  /** 保管場所の表示順を一括保存 */
  reorderStorageLocations: (householdId: string, orderedIds: string[]) => Promise<void>;
  /** 単位一覧を取得 */
  fetchUnits: (householdId: string) => Promise<void>;
  /** 単位を追加 */
  addUnit: (householdId: string, name: string, sortOrder: number) => Promise<{ success: boolean }>;
  /** 単位を削除 */
  deleteUnit: (unitId: string) => Promise<{ success: boolean }>;
  /** 単位の表示順を一括保存 */
  reorderUnits: (householdId: string, orderedIds: string[]) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  inventoryItems: [],
  categories: [],
  storageLocations: [],
  units: [],
  loading: false,
  error: null,

  fetchProducts: async (householdId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ products: data as ProductWithCategory[], loading: false });
    }
  },

  fetchInventory: async (householdId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('inventory')
      .select('*, product:products(*, category:categories(*))')
      .in('product_id', (
        await supabase
          .from('products')
          .select('id')
          .eq('household_id', householdId)
          .eq('is_active', true)
      ).data?.map((p: { id: string }) => p.id) ?? [])
      .order('stock_status');

    if (error) {
      set({ error: error.message, loading: false });
    } else {
      set({ inventoryItems: data as InventoryWithProduct[], loading: false });
    }
  },

  fetchCategories: async (householdId) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order');

    if (data) {
      set({ categories: data });
    }
  },

  addProduct: async (householdId, formData) => {
    // 商品をinsert
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        household_id: householdId,
        name: formData.name,
        category_id: formData.category_id || null,
        unit: formData.unit,
        brand: formData.brand || null,
        storage_location: formData.storage_location || null,
        min_stock_threshold: formData.min_stock_threshold,
        is_expiry_managed: formData.is_expiry_managed,
      })
      .select()
      .single();

    if (productError || !product) {
      return { success: false, error: productError?.message ?? '商品の追加に失敗しました' };
    }

    // 在庫レコードを作成
    const stockStatus = calculateStockStatus(
      formData.initial_quantity,
      formData.min_stock_threshold
    );

    await supabase.from('inventory').insert({
      product_id: product.id,
      current_quantity: formData.initial_quantity,
      stock_status: stockStatus,
    });

    // ストアを更新
    await get().fetchProducts(householdId);
    await get().fetchInventory(householdId);

    return { success: true, error: null };
  },

  updateProduct: async (productId, data) => {
    const { error } = await supabase
      .from('products')
      .update(data)
      .eq('id', productId);

    return { success: !error };
  },

  updateInventoryQuantity: async (productId, newQuantity, minThreshold) => {
    const stockStatus = calculateStockStatus(newQuantity, minThreshold);

    await supabase
      .from('inventory')
      .update({
        current_quantity: newQuantity,
        stock_status: stockStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId);
  },

  addCategory: async (householdId, name, sortOrder) => {
    const { error } = await supabase
      .from('categories')
      .insert({ household_id: householdId, name, sort_order: sortOrder });

    if (!error) {
      await get().fetchCategories(householdId);
    }
    return { success: !error };
  },

  deleteCategory: async (categoryId) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    return { success: !error };
  },

  swapCategoryOrder: async (householdId, categoryId, direction) => {
    const { categories } = get();
    const index = categories.findIndex((c) => c.id === categoryId);
    if (index < 0) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;

    const current = categories[index];
    const target = categories[swapIndex];

    // sort_orderを入れ替え
    await supabase
      .from('categories')
      .update({ sort_order: target.sort_order })
      .eq('id', current.id);

    await supabase
      .from('categories')
      .update({ sort_order: current.sort_order })
      .eq('id', target.id);

    await get().fetchCategories(householdId);
  },

  reorderCategories: async (householdId, orderedIds) => {
    // 各カテゴリのsort_orderを配列順に更新
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('categories')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );
    await Promise.all(updates);
    await get().fetchCategories(householdId);
  },

  fetchStorageLocations: async (householdId) => {
    const { data } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order');

    if (data) {
      set({ storageLocations: data });
    }
  },

  addStorageLocation: async (householdId, name, sortOrder) => {
    const { error } = await supabase
      .from('storage_locations')
      .insert({ household_id: householdId, name, sort_order: sortOrder });

    if (!error) {
      await get().fetchStorageLocations(householdId);
    }
    return { success: !error };
  },

  deleteStorageLocation: async (locationId) => {
    const { error } = await supabase
      .from('storage_locations')
      .delete()
      .eq('id', locationId);

    return { success: !error };
  },

  reorderStorageLocations: async (householdId, orderedIds) => {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('storage_locations')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );
    await Promise.all(updates);
    await get().fetchStorageLocations(householdId);
  },

  fetchUnits: async (householdId) => {
    const { data } = await supabase
      .from('units')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order');

    if (data) {
      set({ units: data });
    }
  },

  addUnit: async (householdId, name, sortOrder) => {
    const { error } = await supabase
      .from('units')
      .insert({ household_id: householdId, name, sort_order: sortOrder });

    if (!error) {
      await get().fetchUnits(householdId);
    }
    return { success: !error };
  },

  deleteUnit: async (unitId) => {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', unitId);

    return { success: !error };
  },

  reorderUnits: async (householdId, orderedIds) => {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('units')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );
    await Promise.all(updates);
    await get().fetchUnits(householdId);
  },
}));
