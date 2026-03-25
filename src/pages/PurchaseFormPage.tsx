/**
 * 購入登録画面
 * 買い物リストから遷移し、購入内容を記録して在庫に反映する
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { getTodayString } from '@/utils/helpers';
import toast from 'react-hot-toast';

export function PurchaseFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { householdId, user } = useAuthStore();
  const { products, fetchProducts, fetchInventory } = useProductStore();
  const { markAsPurchased, fetchItems } = useShoppingStore();
  const { stores, recordPurchase, fetchStores } = usePurchaseStore();

  // URLパラメータから初期値を取得
  const shoppingItemId = searchParams.get('shoppingItemId');
  const initialProductId = searchParams.get('productId') ?? '';
  const initialItemName = searchParams.get('itemName') ?? '';

  // フォーム状態
  const [productId, setProductId] = useState(initialProductId);
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isSale, setIsSale] = useState(false);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    fetchProducts(householdId);
    fetchStores(householdId);
    fetchInventory(householdId);
  }, [householdId, fetchProducts, fetchStores, fetchInventory]);

  // 選択中の商品の情報
  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error('商品を選択してください');
      return;
    }
    if (!price || Number(price) < 0) {
      toast.error('価格を入力してください');
      return;
    }
    if (!householdId) return;

    setSubmitting(true);

    const minThreshold = selectedProduct?.min_stock_threshold ?? 1;

    const { success, error } = await recordPurchase({
      household_id: householdId,
      product_id: productId,
      store_id: storeId || null,
      store_name: !storeId && storeName ? storeName : null,
      purchase_date: purchaseDate,
      price: Number(price),
      quantity: Number(quantity) || 1,
      is_sale: isSale,
      memo: memo || null,
      created_by: user?.id ?? null,
      min_stock_threshold: minThreshold,
    });

    if (success) {
      // 買い物リストから遷移した場合は購入済みにする
      if (shoppingItemId) {
        await markAsPurchased(shoppingItemId, user?.id ?? null);
        if (householdId) await fetchItems(householdId);
      }

      // 在庫を再取得
      if (householdId) await fetchInventory(householdId);

      toast.success('購入を記録しました');
      navigate(-1);
    } else {
      toast.error(error ?? '記録に失敗しました');
    }

    setSubmitting(false);
  };

  return (
    <div>
      <PageHeader title="購入記録" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* 商品選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            商品 <span className="text-red-500">*</span>
          </label>
          {initialItemName && (
            <p className="text-sm text-emerald-600 mb-1 font-medium">{initialItemName}</p>
          )}
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">商品を選択</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.category?.name ?? '未分類'})
              </option>
            ))}
          </select>
        </div>

        {/* 店舗選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            店舗
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">新しい店舗を入力</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {!storeId && (
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="店舗名を入力"
              className="w-full mt-2 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>

        {/* 購入日 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            購入日
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 価格・数量 横並び */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              価格（円） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min={0}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数量
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* セール品チェック */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sale"
            checked={isSale}
            onChange={(e) => setIsSale(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          <label htmlFor="sale" className="text-sm text-gray-700">
            セール品・特売
          </label>
        </div>

        {/* メモ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            メモ
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="任意のメモ"
          />
        </div>

        {/* 送信 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? '記録中...' : '購入を記録する'}
        </button>
      </form>
    </div>
  );
}
