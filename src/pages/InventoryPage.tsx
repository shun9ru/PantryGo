/**
 * 在庫一覧画面
 * 在庫数の表示・更新、状態別色分け、買い物リスト追加、価格・店舗登録
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Filter, Tag, Check, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { cn } from '@/utils/helpers';
import { PageHeader } from '@/components/layout/PageHeader';
import { StockBadge } from '@/components/common/StockBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PriceEntryModal } from '@/components/common/PriceEntryModal';
import { STOCK_STATUS_CONFIG } from '@/utils/constants';
import type { StockStatus } from '@/types/database';
import toast from 'react-hot-toast';

export function InventoryPage() {
  const navigate = useNavigate();
  const { householdId, user } = useAuthStore();
  const { inventoryItems, fetchInventory, updateInventoryQuantity, categories, storageLocations, fetchCategories, fetchStorageLocations, loading } = useProductStore();
  const { items: shoppingItems, addItem, fetchItems: fetchShoppingItems } = useShoppingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  // 価格登録モーダルの状態
  const [priceModal, setPriceModal] = useState<{
    open: boolean;
    productId: string;
    productName: string;
    minStockThreshold: number;
  }>({ open: false, productId: '', productName: '', minStockThreshold: 1 });

  useEffect(() => {
    if (!householdId) return;
    fetchInventory(householdId);
    fetchShoppingItems(householdId);
    fetchCategories(householdId);
    fetchStorageLocations(householdId);
  }, [householdId, fetchInventory, fetchShoppingItems, fetchCategories, fetchStorageLocations]);

  // 買い物リストに未購入で追加済みの商品IDセット
  const pendingProductIds = new Set(
    shoppingItems
      .filter((i) => i.status === 'pending' && i.product_id)
      .map((i) => i.product_id)
  );

  // フィルタ
  const filtered = inventoryItems.filter((item) => {
    const matchSearch = !searchQuery || item.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !statusFilter || item.stock_status === statusFilter;
    const matchCategory = !categoryFilter || item.product.category_id === categoryFilter;
    const matchLocation = !locationFilter || item.product.storage_location === locationFilter;
    return matchSearch && matchStatus && matchCategory && matchLocation;
  });

  /** 在庫数を変更 */
  const handleQuantityChange = async (
    productId: string,
    current: number,
    delta: number,
    minThreshold: number
  ) => {
    const newQty = Math.max(0, current + delta);
    await updateInventoryQuantity(productId, newQty, minThreshold);
    // ストアが自動更新されるため fetchInventory は不要
  };

  /** 買い物リストに追加 */
  const handleAddToShopping = async (productId: string, productName: string) => {
    if (!householdId) return;
    const { success, error } = await addItem({
      household_id: householdId,
      product_id: productId,
      item_name: productName,
      planned_store_id: null,
      priority: 'medium',
      memo: null,
      added_by: user?.id ?? null,
    });

    if (success) {
      toast.success('買い物リストに追加しました');
      if (householdId) fetchShoppingItems(householdId);
    } else {
      toast.error(error ?? '追加に失敗しました');
    }
  };

  /** 価格登録モーダルを開く */
  const openPriceModal = (productId: string, productName: string, minStockThreshold: number) => {
    setPriceModal({ open: true, productId, productName, minStockThreshold });
  };

  /** 価格登録完了 */
  const handlePriceComplete = () => {
    toast.success('価格を登録しました');
    if (householdId) fetchInventory(householdId);
  };

  return (
    <div>
      <PageHeader title="在庫管理" />

      {/* フィルタエリア */}
      <div className="bg-white border-b border-gray-100 space-y-2 px-4 py-3">
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="商品を検索..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 在庫状態フィルタ */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              !statusFilter ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Filter size={12} />
            すべて
          </button>
          {(Object.entries(STOCK_STATUS_CONFIG) as [StockStatus, typeof STOCK_STATUS_CONFIG[StockStatus]][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  statusFilter === key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {config.label}
              </button>
            )
          )}
        </div>

        {/* カテゴリ・保管場所フィルタ */}
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={cn(
              'flex-1 px-2 py-1 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500',
              categoryFilter ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-600'
            )}
          >
            <option value="">カテゴリ: すべて</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={cn(
              'flex-1 px-2 py-1 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500',
              locationFilter ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-600'
            )}
          >
            <option value="">保管場所: すべて</option>
            {storageLocations.map((loc) => (
              <option key={loc.id} value={loc.name}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 在庫リスト */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="在庫データがありません"
          description="商品を追加すると在庫が表示されます"
          action={
            <button
              onClick={() => navigate('/products/new')}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
            >
              商品を追加
            </button>
          }
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between">
                {/* 商品情報 */}
                <button
                  onClick={() => navigate(`/products/${item.product_id}`)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product.name}
                    </p>
                    <StockBadge status={item.stock_status} compact />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.product.category?.name ?? '未分類'}
                    {item.product.storage_location && ` ・ ${item.product.storage_location}`}
                  </p>
                </button>

                {/* 数量操作 */}
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        item.product_id,
                        item.current_quantity,
                        -1,
                        item.product.min_stock_threshold
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-gray-900">
                    {item.current_quantity}
                  </span>
                  <button
                    onClick={() =>
                      handleQuantityChange(
                        item.product_id,
                        item.current_quantity,
                        1,
                        item.product.min_stock_threshold
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* アクションボタン行 */}
              <div className="mt-2 flex gap-2">
                {/* 価格・店舗登録ボタン */}
                <button
                  onClick={() =>
                    openPriceModal(
                      item.product_id,
                      item.product.name,
                      item.product.min_stock_threshold
                    )
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium"
                >
                  <Tag size={14} />
                  価格・店舗
                </button>

                {/* 買い物リスト追加ボタン（全商品に表示、追加済みかどうか表示） */}
                {pendingProductIds.has(item.product_id) ? (
                  <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">
                    <Check size={14} />
                    リスト追加済み
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddToShopping(item.product_id, item.product.name)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium',
                      item.stock_status === 'out'
                        ? 'bg-red-50 text-red-600'
                        : item.stock_status === 'low'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-blue-50 text-blue-600'
                    )}
                  >
                    <ShoppingCart size={14} />
                    買い物リストへ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 価格・店舗登録モーダル */}
      <PriceEntryModal
        open={priceModal.open}
        onClose={() => setPriceModal((prev) => ({ ...prev, open: false }))}
        onComplete={handlePriceComplete}
        productId={priceModal.productId}
        productName={priceModal.productName}
        householdId={householdId ?? ''}
        userId={user?.id ?? null}
        minStockThreshold={priceModal.minStockThreshold}
      />
    </div>
  );
}
