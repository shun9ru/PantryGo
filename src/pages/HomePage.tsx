/**
 * ホーム画面
 * 在庫不足数、買い物リスト件数、最近の購入、お得情報を一覧表示
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShoppingCart,
  TrendingDown,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { formatPrice, formatDate } from '@/utils/helpers';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function HomePage() {
  const navigate = useNavigate();
  const { householdId, user } = useAuthStore();
  const { inventoryItems, fetchInventory, loading: invLoading } = useProductStore();
  const { items: shoppingItems, fetchItems: fetchShopping } = useShoppingStore();
  const { history, fetchHistory, getRecentHistory } = usePurchaseStore();

  // 初回データ取得
  useEffect(() => {
    if (!householdId) return;
    fetchInventory(householdId);
    fetchShopping(householdId);
    fetchHistory(householdId);
  }, [householdId, fetchInventory, fetchShopping, fetchHistory]);

  // 集計
  const lowStockCount = inventoryItems.filter(
    (i) => i.stock_status === 'low' || i.stock_status === 'out'
  ).length;
  const pendingCount = shoppingItems.filter((i) => i.status === 'pending').length;
  const recentPurchases = getRecentHistory(5);

  // 最安値情報：最近の購入で最も安いものを簡易表示
  const bestDeals = history
    .filter((h) => h.is_sale)
    .slice(0, 3);

  if (invLoading) return <LoadingSpinner />;

  return (
    <div>
      {/* ヘッダー */}
      <div className="bg-emerald-600 text-white px-4 pt-12 pb-6">
        <p className="text-emerald-100 text-sm">こんにちは</p>
        <h1 className="text-xl font-bold mt-0.5">
          {user?.email?.split('@')[0] ?? 'ユーザー'}さん
        </h1>
      </div>

      {/* サマリーカード */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 在庫不足 */}
          <button
            onClick={() => navigate('/inventory')}
            className="bg-white rounded-xl shadow-sm p-4 text-left"
          >
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <AlertTriangle size={18} />
              <span className="text-xs font-medium">在庫不足</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {lowStockCount}
              <span className="text-sm font-normal text-gray-500 ml-1">件</span>
            </p>
          </button>

          {/* 買い物リスト */}
          <button
            onClick={() => navigate('/shopping')}
            className="bg-white rounded-xl shadow-sm p-4 text-left"
          >
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <ShoppingCart size={18} />
              <span className="text-xs font-medium">買い物リスト</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {pendingCount}
              <span className="text-sm font-normal text-gray-500 ml-1">件</span>
            </p>
          </button>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="px-4 mt-4 flex gap-2">
        <button
          onClick={() => navigate('/products/new')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          商品追加
        </button>
        <button
          onClick={() => navigate('/shopping')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
        >
          <ShoppingCart size={16} />
          買い物へ
        </button>
      </div>

      {/* 最近の購入履歴 */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">最近の購入</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-xs text-emerald-600 flex items-center"
          >
            すべて見る
            <ChevronRight size={14} />
          </button>
        </div>

        {recentPurchases.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            購入履歴がありません
          </p>
        ) : (
          <div className="space-y-2">
            {recentPurchases.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.product?.name ?? '不明な商品'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.store?.name ?? '店舗不明'} ・ {formatDate(p.purchase_date)}
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formatPrice(p.price)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* お得情報 */}
      {bestDeals.length > 0 && (
        <section className="px-4 mt-6 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
            <TrendingDown size={16} className="text-emerald-600" />
            セール購入
          </h2>
          <div className="space-y-2">
            {bestDeals.map((d) => (
              <div
                key={d.id}
                className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {d.product?.name ?? '不明'}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {d.store?.name ?? '店舗不明'} でセール購入
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-700">
                  {formatPrice(d.price)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* フッタースペース */}
      <div className="h-4" />
    </div>
  );
}
