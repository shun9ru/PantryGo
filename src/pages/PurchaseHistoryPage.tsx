/**
 * 購入履歴画面
 * 履歴一覧、商品/店舗で絞り込み、日付順ソート
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatPrice, formatDate } from '@/utils/helpers';
import { Receipt } from 'lucide-react';

export function PurchaseHistoryPage() {
  const { householdId } = useAuthStore();
  const { products, fetchProducts } = useProductStore();
  const { history, stores, fetchHistory, fetchStores, loading } = usePurchaseStore();

  const [filterProduct, setFilterProduct] = useState('');
  const [filterStore, setFilterStore] = useState('');

  useEffect(() => {
    if (!householdId) return;
    fetchHistory(householdId);
    fetchStores(householdId);
    fetchProducts(householdId);
  }, [householdId, fetchHistory, fetchStores, fetchProducts]);

  // フィルタ
  const filtered = history.filter((h) => {
    const matchProduct = !filterProduct || h.product_id === filterProduct;
    const matchStore = !filterStore || h.store_id === filterStore;
    return matchProduct && matchStore;
  });

  return (
    <div>
      <PageHeader title="購入履歴" />

      {/* フィルタ */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
        <select
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">すべての商品</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">すべての店舗</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 履歴リスト */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="購入履歴がありません"
          description="買い物をすると履歴が記録されます"
        />
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((record) => (
            <div key={record.id} className="bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {record.product?.name ?? '不明な商品'}
                    </p>
                    {record.is_sale && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                        セール
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {record.store?.name ?? '店舗不明'} ・ {formatDate(record.purchase_date)}
                    ・ {record.quantity}点
                  </p>
                  {record.memo && (
                    <p className="text-xs text-gray-400 mt-0.5">{record.memo}</p>
                  )}
                </div>
                <div className="text-right ml-2">
                  <p className="text-sm font-bold text-gray-900">
                    {formatPrice(record.price)}
                  </p>
                  {record.quantity > 1 && (
                    <p className="text-xs text-gray-400">
                      @{formatPrice(Math.round(record.price / record.quantity))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
