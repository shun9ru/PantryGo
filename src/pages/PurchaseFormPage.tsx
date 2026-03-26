/**
 * 購入登録画面
 * 買い物リストから遷移し、購入内容を記録して在庫に反映する
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { NumberWheelPicker } from '@/components/common/NumberWheelPicker';
import { getTodayString } from '@/utils/helpers';
import { calcPriceWithoutTax } from '@/utils/constants';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

/** 1商品分の購入データ */
interface PurchaseEntry {
  product_id: string;
  price: string;
  quantity: number;
  is_sale: boolean;
  is_tax_included: boolean;
}

const emptyEntry = (): PurchaseEntry => ({
  product_id: '',
  price: '',
  quantity: 1,
  is_sale: false,
  is_tax_included: false,
});

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
  const [batchMode, setBatchMode] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 単体登録用
  const [singleProductId, setSingleProductId] = useState(initialProductId);
  const [singlePrice, setSinglePrice] = useState('');
  const [singleQuantity, setSingleQuantity] = useState(1);
  const [singleIsSale, setSingleIsSale] = useState(false);
  const [singleIsTaxIncluded, setSingleIsTaxIncluded] = useState(false);

  // まとめて登録用
  const [entries, setEntries] = useState<PurchaseEntry[]>([
    { ...emptyEntry(), product_id: initialProductId },
  ]);

  useEffect(() => {
    if (!householdId) return;
    fetchProducts(householdId);
    fetchStores(householdId);
    fetchInventory(householdId);
  }, [householdId, fetchProducts, fetchStores, fetchInventory]);

  /** 行を追加 */
  const addRow = () => {
    setEntries([...entries, emptyEntry()]);
  };

  /** 行を削除 */
  const removeRow = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  /** 行のデータを更新 */
  const updateEntry = (index: number, field: keyof PurchaseEntry, value: string | number | boolean) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  /** 単体登録 */
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!singleProductId) {
      toast.error('商品を選択してください');
      return;
    }
    if (!singlePrice || Number(singlePrice) < 0) {
      toast.error('価格を入力してください');
      return;
    }
    if (!householdId) return;

    setSubmitting(true);

    const selectedProduct = products.find((p) => p.id === singleProductId);
    const minThreshold = selectedProduct?.min_stock_threshold ?? 1;

    // 税込価格の場合は税抜に変換
    const priceWithoutTax = singleIsTaxIncluded
      ? calcPriceWithoutTax(Number(singlePrice))
      : Number(singlePrice);

    const { success, error } = await recordPurchase({
      household_id: householdId,
      product_id: singleProductId,
      store_id: storeId || null,
      store_name: !storeId && storeName ? storeName : null,
      purchase_date: purchaseDate,
      price: priceWithoutTax,
      quantity: singleQuantity,
      is_sale: singleIsSale,
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

  /** まとめて登録 */
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!householdId) return;

    // 有効な行だけフィルタ（商品と価格が入っているもの）
    const validEntries = entries.filter((e) => e.product_id && e.price && Number(e.price) >= 0);

    if (validEntries.length === 0) {
      toast.error('商品と価格を入力してください');
      return;
    }

    setSubmitting(true);

    let successCount = 0;

    for (const entry of validEntries) {
      const selectedProduct = products.find((p) => p.id === entry.product_id);
      const minThreshold = selectedProduct?.min_stock_threshold ?? 1;

      // 税込価格の場合は税抜に変換
      const priceWithoutTax = entry.is_tax_included
        ? calcPriceWithoutTax(Number(entry.price))
        : Number(entry.price);

      const { success } = await recordPurchase({
        household_id: householdId,
        product_id: entry.product_id,
        store_id: storeId || null,
        store_name: !storeId && storeName ? storeName : null,
        purchase_date: purchaseDate,
        price: priceWithoutTax,
        quantity: entry.quantity,
        is_sale: entry.is_sale,
        memo: null,
        created_by: user?.id ?? null,
        min_stock_threshold: minThreshold,
      });

      if (success) successCount++;
    }

    setSubmitting(false);

    if (successCount > 0) {
      // 買い物リストから遷移した場合は購入済みにする
      if (shoppingItemId) {
        await markAsPurchased(shoppingItemId, user?.id ?? null);
        if (householdId) await fetchItems(householdId);
      }

      // 在庫を再取得
      if (householdId) await fetchInventory(householdId);

      toast.success(`${successCount}件の購入を記録しました`);
      navigate(-1);
    } else {
      toast.error('記録に失敗しました');
    }
  };

  return (
    <div>
      <PageHeader title="購入記録" showBack />

      {/* モード切替 */}
      <div className="flex bg-white border-b border-gray-200">
        <button
          type="button"
          onClick={() => setBatchMode(false)}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
            !batchMode
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          1件ずつ登録
        </button>
        <button
          type="button"
          onClick={() => setBatchMode(true)}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
            batchMode
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          まとめて登録
        </button>
      </div>

      <form
        onSubmit={batchMode ? handleBatchSubmit : handleSingleSubmit}
        className="p-4 space-y-4"
      >
        {/* === 単体モード：商品選択 === */}
        {!batchMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品 <span className="text-red-500">*</span>
            </label>
            {initialItemName && (
              <p className="text-sm text-emerald-600 mb-1 font-medium">{initialItemName}</p>
            )}
            <select
              value={singleProductId}
              onChange={(e) => setSingleProductId(e.target.value)}
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
        )}

        {/* === 共通設定（まとめて登録時） === */}
        {batchMode && (
          <div className="bg-emerald-50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-emerald-700">以下の設定が全商品に適用されます</p>
          </div>
        )}

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

        {/* === 単体モード：価格・数量 === */}
        {!batchMode && (
          <>
            {/* 価格 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                価格（円） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={singlePrice}
                onChange={(e) => setSinglePrice(e.target.value)}
                min={0}
                placeholder="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* 税込・税抜切替 */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-500">税:</span>
                <button
                  type="button"
                  onClick={() => setSingleIsTaxIncluded(false)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    !singleIsTaxIncluded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  税抜
                </button>
                <button
                  type="button"
                  onClick={() => setSingleIsTaxIncluded(true)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    singleIsTaxIncluded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  税込
                </button>
              </div>
            </div>

            {/* 数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
              </label>
              <NumberWheelPicker
                value={singleQuantity}
                onChange={setSingleQuantity}
                min={1}
                max={50}
                label="購入数量を選択"
              />
            </div>

            {/* セール品チェック */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="sale"
                checked={singleIsSale}
                onChange={(e) => setSingleIsSale(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <label htmlFor="sale" className="text-sm text-gray-700">
                セール品・特売
              </label>
            </div>
          </>
        )}

        {/* === まとめて登録モード：商品リスト === */}
        {batchMode && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              購入商品リスト <span className="text-red-500">*</span>
            </label>

            {entries.map((entry, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* 商品選択 */}
                <select
                  value={entry.product_id}
                  onChange={(e) => updateEntry(index, 'product_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">商品を選択</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category?.name ?? '未分類'})
                    </option>
                  ))}
                </select>

                {/* 価格 */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">¥</span>
                  <input
                    type="number"
                    value={entry.price}
                    onChange={(e) => updateEntry(index, 'price', e.target.value)}
                    min={0}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* 数量 */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">数量</label>
                  <NumberWheelPicker
                    value={entry.quantity}
                    onChange={(val) => updateEntry(index, 'quantity', val)}
                    min={1}
                    max={50}
                    label="購入数量を選択"
                  />
                </div>

                {/* 税込・税抜 + セール */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">税:</span>
                    <button
                      type="button"
                      onClick={() => updateEntry(index, 'is_tax_included', false)}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        !entry.is_tax_included
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      税抜
                    </button>
                    <button
                      type="button"
                      onClick={() => updateEntry(index, 'is_tax_included', true)}
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        entry.is_tax_included
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      税込
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap ml-auto">
                    <input
                      type="checkbox"
                      checked={entry.is_sale}
                      onChange={(e) => updateEntry(index, 'is_sale', e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-600 rounded"
                    />
                    セール
                  </label>
                </div>
              </div>
            ))}

            {/* 行追加ボタン */}
            <button
              type="button"
              onClick={addRow}
              className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-300 text-gray-400 rounded-lg text-sm hover:border-emerald-400 hover:text-emerald-600"
            >
              <Plus size={16} />
              商品を追加
            </button>

            <p className="text-xs text-gray-400">
              商品と価格が入力された行のみ登録されます。
            </p>
          </div>
        )}

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
          {submitting
            ? '記録中...'
            : batchMode
              ? `${entries.filter((e) => e.product_id && e.price).length}件をまとめて記録`
              : '購入を記録する'
          }
        </button>
      </form>
    </div>
  );
}
