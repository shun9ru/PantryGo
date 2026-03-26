/**
 * 買い物リスト画面
 * チェックを入れて数量を入力し、まとめて購入登録できる
 */
import { useEffect, useState } from 'react';
import {
  Plus,
  Check,
  Trash2,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useShoppingStore } from '@/stores/shoppingStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useProductStore } from '@/stores/productStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { NumberWheelPicker } from '@/components/common/NumberWheelPicker';
import { getTodayString } from '@/utils/helpers';
import { calcPriceWithoutTax } from '@/utils/constants';
import type { ShoppingPriority, ShoppingListItemWithDetails } from '@/types/database';
import toast from 'react-hot-toast';
import { cn } from '@/utils/helpers';

/** チェック済みアイテムの入力データ */
interface CheckedItemData {
  quantity: number;
  price: string;
  store_id: string;
  store_name: string;
  is_sale: boolean;
  is_tax_included: boolean;
}

export function ShoppingListPage() {
  const { householdId, user } = useAuthStore();
  const { items, fetchItems, addManualItem, markAsPurchased, deleteItem, loading } = useShoppingStore();
  const { stores, fetchStores, recordPurchase } = usePurchaseStore();
  const { fetchInventory } = useProductStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newPriority, setNewPriority] = useState<ShoppingPriority>('medium');
  const [tab, setTab] = useState<'pending' | 'purchased'>('pending');

  // チェック済みアイテムの管理 (itemId -> データ)
  const [checkedItems, setCheckedItems] = useState<Map<string, CheckedItemData>>(new Map());
  // まとめて登録モーダル
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDate, setBatchDate] = useState(getTodayString());
  const [batchStoreId, setBatchStoreId] = useState('');
  const [batchStoreName, setBatchStoreName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    fetchItems(householdId);
    fetchStores(householdId);
  }, [householdId, fetchItems, fetchStores]);

  const pendingItems = items.filter((i) => i.status === 'pending');
  const purchasedItems = items.filter((i) => i.status === 'purchased');
  const checkedCount = checkedItems.size;

  /** アイテムのチェックをトグル */
  const toggleCheck = (item: ShoppingListItemWithDetails) => {
    const newMap = new Map(checkedItems);
    if (newMap.has(item.id)) {
      newMap.delete(item.id);
    } else {
      newMap.set(item.id, {
        quantity: 1,
        price: '',
        store_id: '',
        store_name: '',
        is_sale: false,
        is_tax_included: false,
      });
    }
    setCheckedItems(newMap);
  };

  /** チェック済みアイテムのデータを更新 */
  const updateCheckedData = (itemId: string, field: keyof CheckedItemData, value: string | number | boolean) => {
    const newMap = new Map(checkedItems);
    const data = newMap.get(itemId);
    if (!data) return;
    const updated = { ...data, [field as string]: value };
    if (field === 'store_id' && value) {
      updated.store_name = '';
    }
    newMap.set(itemId, updated);
    setCheckedItems(newMap);
  };

  /** 手動追加 */
  const handleAddManual = async () => {
    if (!newItemName.trim() || !householdId) return;
    const { success } = await addManualItem({
      household_id: householdId,
      item_name: newItemName.trim(),
      priority: newPriority,
      memo: null,
      added_by: user?.id ?? null,
    });

    if (success) {
      setNewItemName('');
      setShowAddForm(false);
      toast.success('追加しました');
    }
  };

  /** 削除 */
  const handleDelete = async (itemId: string) => {
    // チェックも外す
    const newMap = new Map(checkedItems);
    newMap.delete(itemId);
    setCheckedItems(newMap);

    await deleteItem(itemId);
    if (householdId) fetchItems(householdId);
    toast.success('削除しました');
  };

  /** まとめて購入登録 */
  const handleBatchPurchase = async () => {
    if (!householdId || checkedCount === 0) return;
    setSubmitting(true);

    for (const [itemId, data] of checkedItems.entries()) {
      const item = pendingItems.find((i) => i.id === itemId);
      if (!item) continue;

      // 商品紐付けありで価格入力がある場合のみ購入履歴を作成
      if (item.product_id && data.price && Number(data.price) >= 0) {
        // 商品の閾値を取得（デフォルト1）
        const minThreshold = 1; // 簡易的にデフォルト値を使用
        // 税込価格の場合は税抜に変換
        const priceWithoutTax = data.is_tax_included
          ? calcPriceWithoutTax(Number(data.price))
          : Number(data.price);

        // 店舗はモーダルで選択したものを使用（個別設定があればそちらを優先）
        const finalStoreId = data.store_id || batchStoreId || null;
        const finalStoreName = !finalStoreId && (data.store_name || batchStoreName)
          ? (data.store_name || batchStoreName)
          : null;

        await recordPurchase({
          household_id: householdId,
          product_id: item.product_id,
          store_id: finalStoreId,
          store_name: finalStoreName,
          purchase_date: batchDate,
          price: priceWithoutTax,
          quantity: data.quantity,
          is_sale: data.is_sale,
          memo: null,
          created_by: user?.id ?? null,
          min_stock_threshold: minThreshold,
        });
      }

      // 買い物リストを購入済みにマーク
      await markAsPurchased(itemId, user?.id ?? null);
    }

    // データ再取得
    await fetchItems(householdId);
    await fetchInventory(householdId);

    setCheckedItems(new Map());
    setShowBatchModal(false);
    setSubmitting(false);
    toast.success(`${checkedCount}件を購入登録しました`);
  };

  return (
    <div>
      <PageHeader
        title="買い物リスト"
        rightAction={
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-2 text-emerald-600"
          >
            <Plus size={22} />
          </button>
        }
      />

      {/* 手動追加フォーム */}
      {showAddForm && (
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="追加したいもの"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
            />
            <button
              onClick={handleAddManual}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
            >
              追加
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            {(['high', 'medium', 'low'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  newPriority === p ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                優先度: {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* タブ切替 */}
      <div className="flex bg-white border-b border-gray-200">
        <button
          onClick={() => setTab('pending')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
            tab === 'pending'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          未購入 ({pendingItems.length})
        </button>
        <button
          onClick={() => setTab('purchased')}
          className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
            tab === 'purchased'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-gray-400'
          }`}
        >
          購入済み ({purchasedItems.length})
        </button>
      </div>

      {/* リスト */}
      {loading ? (
        <LoadingSpinner />
      ) : tab === 'pending' ? (
        pendingItems.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="買い物リストは空です"
            description="在庫画面や商品詳細から追加できます"
          />
        ) : (
          <div className="pb-24">
            <div className="divide-y divide-gray-100">
              {pendingItems.map((item) => {
                const isChecked = checkedItems.has(item.id);
                const checkedData = checkedItems.get(item.id);

                return (
                  <div key={item.id} className={cn(
                    'bg-white px-4 py-3',
                    isChecked && 'bg-emerald-50/50'
                  )}>
                    <div className="flex items-center gap-3">
                      {/* チェックボタン */}
                      <button
                        onClick={() => toggleCheck(item)}
                        className={cn(
                          'w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-colors',
                          isChecked
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-gray-300 text-gray-300 hover:border-emerald-400'
                        )}
                      >
                        <Check size={14} />
                      </button>

                      {/* アイテム情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            isChecked ? 'text-emerald-800' : 'text-gray-900'
                          )}>
                            {item.item_name}
                          </p>
                          <PriorityBadge priority={item.priority} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.planned_store?.name && `${item.planned_store.name} ・ `}
                          {item.memo && item.memo}
                        </p>
                      </div>

                      {/* 削除 */}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* チェック時：数量・価格・店舗入力エリア */}
                    {isChecked && checkedData && (
                      <div className="mt-2 ml-10 space-y-2">
                        <div className="flex items-center gap-2">
                          {/* 数量 */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <label className="text-xs text-gray-500 whitespace-nowrap">数量</label>
                            <div className="w-20">
                              <NumberWheelPicker
                                value={checkedData.quantity}
                                onChange={(val) => updateCheckedData(item.id, 'quantity', val)}
                                min={1}
                                max={50}
                                label="購入数量を選択"
                              />
                            </div>
                          </div>

                          {/* 価格 */}
                          <div className="flex items-center gap-1 flex-1">
                            <label className="text-xs text-gray-500">価格</label>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">¥</span>
                              <input
                                type="number"
                                value={checkedData.price}
                                onChange={(e) => updateCheckedData(item.id, 'price', e.target.value)}
                                min={0}
                                placeholder="任意"
                                className="w-full pl-6 pr-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 税込・税抜切替 */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">税:</label>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => updateCheckedData(item.id, 'is_tax_included', false)}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                !checkedData.is_tax_included
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              )}
                            >
                              税抜
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCheckedData(item.id, 'is_tax_included', true)}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                checkedData.is_tax_included
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              )}
                            >
                              税込
                            </button>
                          </div>

                          {/* セール */}
                          <label className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                            <input
                              type="checkbox"
                              checked={checkedData.is_sale}
                              onChange={(e) => updateCheckedData(item.id, 'is_sale', e.target.checked)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            特売
                          </label>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : purchasedItems.length === 0 ? (
        <EmptyState title="購入済みの項目はありません" />
      ) : (
        <div className="divide-y divide-gray-100">
          {purchasedItems.map((item) => (
            <div key={item.id} className="bg-white px-4 py-3 opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 line-through">{item.item_name}</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* チェックがある場合のフローティング登録バー */}
      {checkedCount > 0 && tab === 'pending' && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowBatchModal(true)}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <ShoppingCart size={18} />
              {checkedCount}件をまとめて購入登録
            </button>
          </div>
        </div>
      )}

      {/* まとめて登録確認モーダル */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBatchModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
            {/* ヘッダー */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900">
                購入登録の確認
              </h2>
              <button onClick={() => setShowBatchModal(false)} className="p-1 text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* スクロール可能なコンテンツ */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 店舗選択（共通） */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">店舗</label>
                <select
                  value={batchStoreId}
                  onChange={(e) => setBatchStoreId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">新しい店舗を入力</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {!batchStoreId && (
                  <input
                    type="text"
                    value={batchStoreName}
                    onChange={(e) => setBatchStoreName(e.target.value)}
                    placeholder="店舗名を入力"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* 購入日 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">購入日</label>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* チェック済みアイテム一覧 */}
              <div className="space-y-2">
                {Array.from(checkedItems.entries()).map(([itemId, data]) => {
                  const item = pendingItems.find((i) => i.id === itemId);
                  if (!item) return null;

                  // 店舗名の決定（個別設定 > 共通設定）
                  let displayStoreName = null;
                  if (data.store_id) {
                    displayStoreName = stores.find((s) => s.id === data.store_id)?.name;
                  } else if (data.store_name) {
                    displayStoreName = data.store_name;
                  } else if (batchStoreId) {
                    displayStoreName = stores.find((s) => s.id === batchStoreId)?.name;
                  } else if (batchStoreName) {
                    displayStoreName = batchStoreName;
                  }

                  return (
                    <div key={itemId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{item.item_name}</p>
                        <span className="text-xs text-gray-500">×{data.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {data.price && <span>¥{Number(data.price).toLocaleString()}{data.is_tax_included ? '(税込)' : ''}</span>}
                        {displayStoreName && <span>@ {displayStoreName}</span>}
                        {data.is_sale && <span className="text-red-500">セール</span>}
                        {!data.price && !item.product_id && <span>購入済みにマーク</span>}
                        {!data.price && item.product_id && <span>価格未入力（在庫のみ加算）</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* 登録ボタン（固定） */}
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white rounded-b-2xl">
              <button
                onClick={handleBatchPurchase}
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? '登録中...' : `${checkedCount}件を登録する`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
