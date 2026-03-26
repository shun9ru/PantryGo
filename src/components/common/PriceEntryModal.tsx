/**
 * 価格・店舗情報入力モーダル
 * 在庫画面などから呼び出して、複数の店舗×価格を一括登録できる
 */
import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { getTodayString, cn } from '@/utils/helpers';
import { calcPriceWithoutTax } from '@/utils/constants';
import type { Store } from '@/types/database';

/** 1行分の入力データ */
interface PriceEntry {
  store_id: string;
  store_name: string;
  price: string;
  is_sale: boolean;
  is_tax_included: boolean;
}

const emptyEntry = (): PriceEntry => ({
  store_id: '',
  store_name: '',
  price: '',
  is_sale: false,
  is_tax_included: false,
});

interface PriceEntryModalProps {
  /** 表示するかどうか */
  open: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
  /** 登録完了コールバック */
  onComplete: () => void;
  /** 対象商品のID */
  productId: string;
  /** 対象商品の名前（表示用） */
  productName: string;
  /** 世帯ID */
  householdId: string;
  /** 登録者ID */
  userId: string | null;
  /** 商品の在庫閾値（購入時の在庫更新に使用） */
  minStockThreshold: number;
}

export function PriceEntryModal({
  open,
  onClose,
  onComplete,
  productId,
  productName,
  householdId,
  userId,
  minStockThreshold,
}: PriceEntryModalProps) {
  const { stores, fetchStores, recordPurchase } = usePurchaseStore();

  // 複数行の入力データ（初期は1行）
  const [entries, setEntries] = useState<PriceEntry[]>([emptyEntry()]);
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchStores(householdId);
      setEntries([emptyEntry()]);
      setPurchaseDate(getTodayString());
    }
  }, [open, householdId, fetchStores]);

  if (!open) return null;

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
  const updateEntry = (index: number, field: keyof PriceEntry, value: string | boolean) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };

    // 店舗をセレクトで選んだ場合、store_nameをクリア
    if (field === 'store_id' && value) {
      updated[index].store_name = '';
    }

    setEntries(updated);
  };

  /** 登録 */
  const handleSubmit = async () => {
    // 有効な行だけフィルタ（価格が入っているもの）
    const validEntries = entries.filter((e) => e.price && Number(e.price) >= 0);

    if (validEntries.length === 0) {
      return;
    }

    setSubmitting(true);

    for (const entry of validEntries) {
      // 税込価格の場合は税抜に変換
      const priceWithoutTax = entry.is_tax_included
        ? calcPriceWithoutTax(Number(entry.price))
        : Number(entry.price);

      await recordPurchase({
        household_id: householdId,
        product_id: productId,
        store_id: entry.store_id || null,
        store_name: !entry.store_id && entry.store_name ? entry.store_name : null,
        purchase_date: purchaseDate,
        price: priceWithoutTax,
        quantity: 1,
        is_sale: entry.is_sale,
        memo: null,
        created_by: userId,
        min_stock_threshold: minStockThreshold,
      });
    }

    setSubmitting(false);
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* モーダル本体 */}
      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        {/* ヘッダー（固定） */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">
            価格・店舗を登録
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* スクロール可能なコンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 商品名 */}
          <div className="bg-emerald-50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-emerald-800">{productName}</p>
          </div>

          {/* 購入日（全行共通） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              購入日
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 店舗×価格の入力行 */}
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {entries.length > 1 ? `#${index + 1}` : '店舗・価格'}
                  </span>
                  {entries.length > 1 && (
                    <button
                      onClick={() => removeRow(index)}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* 店舗選択 */}
                <select
                  value={entry.store_id}
                  onChange={(e) => updateEntry(index, 'store_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">新しい店舗を入力</option>
                  {stores.map((s: Store) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* 新規店舗名入力 */}
                {!entry.store_id && (
                  <input
                    type="text"
                    value={entry.store_name}
                    onChange={(e) => updateEntry(index, 'store_name', e.target.value)}
                    placeholder="店舗名を入力"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}

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
          </div>

          {/* 行追加ボタン */}
          <button
            type="button"
            onClick={addRow}
            className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-300 text-gray-400 rounded-lg text-sm hover:border-emerald-400 hover:text-emerald-600"
          >
            <Plus size={16} />
            店舗・価格を追加
          </button>
        </div>

        {/* 登録ボタン（固定） */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 pb-safe bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || entries.every((e) => !e.price)}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors touch-manipulation"
          >
            {submitting ? '登録中...' : `${entries.filter((e) => e.price).length}件を登録する`}
          </button>
        </div>
      </div>
    </div>
  );
}
