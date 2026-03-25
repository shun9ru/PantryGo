/**
 * 商品一覧画面
 * 検索、カテゴリ絞り込み、在庫状態表示
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { StockBadge } from '@/components/common/StockBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function ProductListPage() {
  const navigate = useNavigate();
  const { householdId } = useAuthStore();
  const { products, categories, inventoryItems, fetchProducts, fetchCategories, fetchInventory, loading } = useProductStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    if (!householdId) return;
    fetchProducts(householdId);
    fetchCategories(householdId);
    fetchInventory(householdId);
  }, [householdId, fetchProducts, fetchCategories, fetchInventory]);

  // フィルタ処理
  const filtered = products.filter((p) => {
    const matchesSearch = !searchQuery || p.name.includes(searchQuery);
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 在庫情報をマッピング
  const inventoryMap = new Map(inventoryItems.map((i) => [i.product_id, i]));

  return (
    <div>
      <PageHeader
        title="商品一覧"
        rightAction={
          <button
            onClick={() => navigate('/products/new')}
            className="p-2 text-emerald-600"
          >
            <Plus size={22} />
          </button>
        }
      />

      {/* 検索バー */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="商品名で検索"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* カテゴリフィルタ */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-2 whitespace-nowrap">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              !selectedCategory ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* 商品リスト */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="商品がありません"
          description="商品を追加してみましょう"
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
          {filtered.map((product) => {
            const inv = inventoryMap.get(product.id);
            return (
              <button
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {product.category?.name ?? '未分類'} ・ {product.unit}
                    {product.storage_location && ` ・ ${product.storage_location}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {inv && (
                    <>
                      <span className="text-xs text-gray-500">
                        {inv.current_quantity}{product.unit}
                      </span>
                      <StockBadge status={inv.stock_status} />
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
