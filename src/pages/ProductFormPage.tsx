/**
 * 商品登録・編集画面
 * 新規登録（単体 / まとめて追加）と編集に対応
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { NumberWheelPicker } from '@/components/common/NumberWheelPicker';
import toast from 'react-hot-toast';

/** まとめて追加時の1行データ */
interface BulkItem {
  name: string;
  initialQuantity: number;
}

export function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { householdId } = useAuthStore();
  const { products, categories, storageLocations, units, addProduct, updateProduct, fetchProducts, fetchCategories, fetchStorageLocations, fetchUnits } = useProductStore();

  // 共通フォーム状態
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('個');
  const [brand, setBrand] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [minStockThreshold, setMinStockThreshold] = useState(1);
  const [isExpiryManaged, setIsExpiryManaged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 単体登録用
  const [name, setName] = useState('');
  const [initialQuantity, setInitialQuantity] = useState(0);

  // まとめて追加用
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([
    { name: '', initialQuantity: 0 },
    { name: '', initialQuantity: 0 },
    { name: '', initialQuantity: 0 },
  ]);

  // カテゴリ・保管場所取得
  useEffect(() => {
    if (householdId) {
      fetchCategories(householdId);
      fetchStorageLocations(householdId);
      fetchUnits(householdId);
    }
  }, [householdId, fetchCategories, fetchStorageLocations, fetchUnits]);

  // 編集時の初期値セット
  useEffect(() => {
    if (isEdit && id) {
      const product = products.find((p) => p.id === id);
      if (product) {
        setName(product.name);
        setCategoryId(product.category_id ?? '');
        setUnit(product.unit);
        setBrand(product.brand ?? '');
        setStorageLocation(product.storage_location ?? '');
        setMinStockThreshold(product.min_stock_threshold);
        setIsExpiryManaged(product.is_expiry_managed);
      }
    }
  }, [isEdit, id, products]);

  /** まとめて追加の行を更新 */
  const updateBulkItem = (index: number, field: keyof BulkItem, value: string | number) => {
    const updated = [...bulkItems];
    updated[index] = { ...updated[index], [field as string]: value };
    setBulkItems(updated);
  };

  /** 行を追加 */
  const addBulkRow = () => {
    setBulkItems([...bulkItems, { name: '', initialQuantity: 0 }]);
  };

  /** 行を削除 */
  const removeBulkRow = (index: number) => {
    if (bulkItems.length <= 1) return;
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  };

  /** 単体登録 */
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('商品名を入力してください');
      return;
    }
    if (!householdId) return;

    setSubmitting(true);

    if (isEdit && id) {
      const { success } = await updateProduct(id, {
        name: name.trim(),
        category_id: categoryId || null,
        unit,
        brand: brand || null,
        storage_location: storageLocation || null,
        min_stock_threshold: minStockThreshold,
        is_expiry_managed: isExpiryManaged,
      });

      if (success) {
        toast.success('商品を更新しました');
        await fetchProducts(householdId);
        navigate(-1);
      } else {
        toast.error('更新に失敗しました');
      }
    } else {
      const { success, error } = await addProduct(householdId, {
        name: name.trim(),
        category_id: categoryId || null,
        unit,
        brand: brand || null,
        storage_location: storageLocation || null,
        min_stock_threshold: minStockThreshold,
        is_expiry_managed: isExpiryManaged,
        initial_quantity: initialQuantity,
      });

      if (success) {
        toast.success('商品を追加しました');
        navigate('/products');
      } else {
        toast.error(error ?? '追加に失敗しました');
      }
    }

    setSubmitting(false);
  };

  /** まとめて登録 */
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdId) return;

    const validItems = bulkItems.filter((item) => item.name.trim());
    if (validItems.length === 0) {
      toast.error('商品名を1つ以上入力してください');
      return;
    }

    setSubmitting(true);
    let successCount = 0;

    for (const item of validItems) {
      const { success } = await addProduct(householdId, {
        name: item.name.trim(),
        category_id: categoryId || null,
        unit,
        brand: brand || null,
        storage_location: storageLocation || null,
        min_stock_threshold: minStockThreshold,
        is_expiry_managed: isExpiryManaged,
        initial_quantity: item.initialQuantity,
      });
      if (success) successCount++;
    }

    setSubmitting(false);

    if (successCount > 0) {
      toast.success(`${successCount}件の商品を追加しました`);
      navigate('/products');
    } else {
      toast.error('追加に失敗しました');
    }
  };

  return (
    <div>
      <PageHeader title={isEdit ? '商品編集' : '商品追加'} showBack />

      {/* 新規登録時のモード切替 */}
      {!isEdit && (
        <div className="flex bg-white border-b border-gray-200">
          <button
            onClick={() => setBulkMode(false)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
              !bulkMode
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            1件ずつ追加
          </button>
          <button
            onClick={() => setBulkMode(true)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 ${
              bulkMode
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-400'
            }`}
          >
            まとめて追加
          </button>
        </div>
      )}

      <form
        onSubmit={bulkMode && !isEdit ? handleBulkSubmit : handleSingleSubmit}
        className="p-4 space-y-4"
      >
        {/* === 単体モード：商品名 === */}
        {(!bulkMode || isEdit) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="例: 牛乳"
            />
          </div>
        )}

        {/* === 共通設定 === */}
        {bulkMode && !isEdit && (
          <div className="bg-emerald-50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-emerald-700">以下の設定が全商品に適用されます</p>
          </div>
        )}

        {/* カテゴリ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">未分類</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* 単位 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
          <div className="flex flex-wrap gap-2">
            {units.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => setUnit(u.name)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  unit === u.name ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>

        {/* ブランド */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ブランド</label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="例: 明治おいしい牛乳"
          />
        </div>

        {/* 保管場所 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">保管場所</label>
          <div className="flex flex-wrap gap-2">
            {storageLocations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setStorageLocation(storageLocation === loc.name ? '' : loc.name)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  storageLocation === loc.name ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>

        {/* 在庫不足の閾値 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            在庫不足の閾値（この数以下で「少ない」と表示）
          </label>
          <NumberWheelPicker
            value={minStockThreshold}
            onChange={setMinStockThreshold}
            min={0}
            max={20}
            label="在庫不足の閾値を選択"
          />
        </div>

        {/* === 単体モード：初期在庫数 === */}
        {!isEdit && !bulkMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">初期在庫数</label>
            <NumberWheelPicker
              value={initialQuantity}
              onChange={setInitialQuantity}
              min={0}
              max={50}
              label="初期在庫数を選択"
            />
          </div>
        )}

        {/* 期限管理 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="expiry"
            checked={isExpiryManaged}
            onChange={(e) => setIsExpiryManaged(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          <label htmlFor="expiry" className="text-sm text-gray-700">
            賞味期限・使用期限を管理する（将来機能）
          </label>
        </div>

        {/* === まとめて追加モード：商品名リスト === */}
        {bulkMode && !isEdit && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              商品名リスト <span className="text-red-500">*</span>
            </label>

            {bulkItems.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateBulkItem(index, 'name', e.target.value)}
                    placeholder="商品名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeBulkRow(index)}
                    disabled={bulkItems.length <= 1}
                    className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <span className="text-xs text-gray-500 whitespace-nowrap w-16">初期在庫:</span>
                  <div className="flex-1">
                    <NumberWheelPicker
                      value={item.initialQuantity}
                      onChange={(val) => updateBulkItem(index, 'initialQuantity', val)}
                      min={0}
                      max={50}
                      label="初期在庫数を選択"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBulkRow}
              className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-300 text-gray-400 rounded-lg text-sm hover:border-emerald-400 hover:text-emerald-600"
            >
              <Plus size={16} />
              行を追加
            </button>

            <p className="text-xs text-gray-400">
              右の数字は初期在庫数です。空行は無視されます。
            </p>
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {submitting
            ? '保存中...'
            : isEdit
              ? '更新する'
              : bulkMode
                ? `${bulkItems.filter((i) => i.name.trim()).length}件をまとめて追加`
                : '追加する'
          }
        </button>
      </form>
    </div>
  );
}
