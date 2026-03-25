/**
 * 商品詳細画面
 * 商品情報、在庫、買い物リスト追加、購入履歴、価格比較を表示
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit2,
  ShoppingCart,
  TrendingDown,
  Award,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { StockBadge } from '@/components/common/StockBadge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatPrice, formatDate } from '@/utils/helpers';
import type { PriceComparison } from '@/types/database';
import toast from 'react-hot-toast';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { householdId, user } = useAuthStore();
  const { products, inventoryItems, fetchProducts, fetchInventory } = useProductStore();
  const { addItem } = useShoppingStore();
  const { history, getPriceComparison, fetchHistory } = usePurchaseStore();

  const [priceComparison, setPriceComparison] = useState<PriceComparison | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const product = products.find((p) => p.id === id);
  const inventory = inventoryItems.find((i) => i.product_id === id);
  const productHistory = history.filter((h) => h.product_id === id).slice(0, 10);

  // データ取得
  useEffect(() => {
    if (!householdId) return;
    fetchProducts(householdId);
    fetchInventory(householdId);
    fetchHistory(householdId);
  }, [householdId, fetchProducts, fetchInventory, fetchHistory]);

  // 価格比較の取得
  useEffect(() => {
    if (!id) return;
    setLoadingPrice(true);
    getPriceComparison(id).then((data) => {
      setPriceComparison(data);
      setLoadingPrice(false);
    });
  }, [id, getPriceComparison, history]);

  /** 買い物リストに追加 */
  const handleAddToShopping = async () => {
    if (!product || !householdId) return;
    const { success, error } = await addItem({
      household_id: householdId,
      product_id: product.id,
      item_name: product.name,
      planned_store_id: null,
      priority: 'medium',
      memo: null,
      added_by: user?.id ?? null,
    });

    if (success) {
      toast.success('買い物リストに追加しました');
    } else {
      toast.error(error ?? '追加に失敗しました');
    }
  };

  if (!product) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title={product.name}
        showBack
        rightAction={
          <button
            onClick={() => navigate(`/products/${id}/edit`)}
            className="p-2 text-gray-600"
          >
            <Edit2 size={18} />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* 基本情報カード */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">{product.name}</h2>
            {inventory && <StockBadge status={inventory.stock_status} />}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">カテゴリ</span>
              <p className="text-gray-700">{product.category?.name ?? '未分類'}</p>
            </div>
            <div>
              <span className="text-gray-400">単位</span>
              <p className="text-gray-700">{product.unit}</p>
            </div>
            <div>
              <span className="text-gray-400">保管場所</span>
              <p className="text-gray-700">{product.storage_location ?? '未設定'}</p>
            </div>
            <div>
              <span className="text-gray-400">在庫数</span>
              <p className="text-gray-700 font-medium">
                {inventory?.current_quantity ?? 0} {product.unit}
              </p>
            </div>
            {product.brand && (
              <div className="col-span-2">
                <span className="text-gray-400">ブランド</span>
                <p className="text-gray-700">{product.brand}</p>
              </div>
            )}
          </div>
        </div>

        {/* 買い物リスト追加ボタン */}
        <button
          onClick={handleAddToShopping}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm"
        >
          <ShoppingCart size={18} />
          買い物リストに追加
        </button>

        {/* 価格比較 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <TrendingDown size={16} className="text-emerald-600" />
            価格比較
          </h3>

          {loadingPrice ? (
            <LoadingSpinner />
          ) : !priceComparison ? (
            <p className="text-sm text-gray-400 text-center py-2">
              購入履歴がないため比較できません
            </p>
          ) : (
            <div>
              {/* サマリ */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-600 mb-1 flex items-center justify-center gap-1">
                    <Award size={12} />
                    最安値
                  </p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatPrice(priceComparison.cheapest_price)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {priceComparison.cheapest_store}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">平均価格</p>
                  <p className="text-lg font-bold text-gray-700">
                    {formatPrice(priceComparison.average_price)}
                  </p>
                  <p className="text-xs text-gray-500">
                    最新: {formatPrice(priceComparison.latest_price)}
                  </p>
                </div>
              </div>

              {/* 店舗別 */}
              <div className="space-y-2">
                {priceComparison.stores.map((s) => {
                  const isCheapest = s.min_price === priceComparison.cheapest_price;
                  return (
                    <div
                      key={s.store_id}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${
                        isCheapest ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {s.store_name}
                          {isCheapest && (
                            <span className="ml-1.5 text-xs text-emerald-600 font-bold">
                              最安
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {s.purchase_count}回購入 ・ 最終: {formatDate(s.latest_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(s.min_price)}
                        </p>
                        <p className="text-xs text-gray-400">
                          〜{formatPrice(s.max_price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 購入履歴 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3">購入履歴</h3>
          {productHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              購入履歴がありません
            </p>
          ) : (
            <div className="space-y-2">
              {productHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm text-gray-700">
                      {h.store?.name ?? '店舗不明'}
                      {h.is_sale && (
                        <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                          セール
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(h.purchase_date)} ・ {h.quantity}{product.unit}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(h.price)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
