/**
 * 設定画面
 * カテゴリ管理、保管場所管理（ドラッグ&ドロップ並び替え）、単位管理、通知設定（将来用）
 */
import { useEffect } from 'react';
import { LogOut, Bell, Tag, MapPin, Ruler, Store as StoreIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProductStore } from '@/stores/productStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { DraggableList } from '@/components/common/DraggableList';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const { householdId, user, signOut } = useAuthStore();
  const {
    categories, fetchCategories, addCategory, deleteCategory, reorderCategories,
    storageLocations, fetchStorageLocations, addStorageLocation, deleteStorageLocation, reorderStorageLocations,
    units, fetchUnits, addUnit, deleteUnit, reorderUnits,
  } = useProductStore();
  const {
    stores, fetchStores, addStore, deleteStore, reorderStores,
  } = usePurchaseStore();

  useEffect(() => {
    if (!householdId) return;
    fetchCategories(householdId);
    fetchStorageLocations(householdId);
    fetchUnits(householdId);
    fetchStores(householdId);
  }, [householdId, fetchCategories, fetchStorageLocations, fetchUnits, fetchStores]);

  /** ログアウト */
  const handleLogout = async () => {
    if (!confirm('ログアウトしますか？')) return;
    await signOut();
  };

  return (
    <div>
      <PageHeader title="設定" />

      <div className="p-4 space-y-6">
        {/* ユーザー情報 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-2">アカウント</h2>
          <p className="text-sm text-gray-600">{user?.email}</p>
        </section>

        {/* カテゴリ管理 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-1">
            <Tag size={14} />
            カテゴリ管理
          </h2>
          <p className="text-xs text-gray-400 mb-2">ドラッグして並び替えできます</p>
          <DraggableList
            items={categories}
            addPlaceholder="カテゴリ名"
            onAdd={async (name) => {
              if (!householdId) return;
              const { success } = await addCategory(householdId, name, categories.length + 1);
              if (success) toast.success('カテゴリを追加しました');
              else toast.error('追加に失敗しました');
            }}
            onDelete={async (id, name) => {
              if (!confirm(`「${name}」を削除しますか？このカテゴリに属する商品は「未分類」になります。`)) return;
              const { success } = await deleteCategory(id);
              if (success) {
                if (householdId) fetchCategories(householdId);
                toast.success('削除しました');
              }
            }}
            onReorder={(ids) => {
              if (householdId) reorderCategories(householdId, ids);
            }}
          />
        </section>

        {/* 保管場所管理 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-1">
            <MapPin size={14} />
            保管場所管理
          </h2>
          <p className="text-xs text-gray-400 mb-2">ドラッグして並び替えできます</p>
          <DraggableList
            items={storageLocations}
            addPlaceholder="保管場所名"
            onAdd={async (name) => {
              if (!householdId) return;
              const { success } = await addStorageLocation(householdId, name, storageLocations.length + 1);
              if (success) toast.success('保管場所を追加しました');
              else toast.error('追加に失敗しました');
            }}
            onDelete={async (id, name) => {
              if (!confirm(`「${name}」を削除しますか？`)) return;
              const { success } = await deleteStorageLocation(id);
              if (success) {
                if (householdId) fetchStorageLocations(householdId);
                toast.success('削除しました');
              }
            }}
            onReorder={(ids) => {
              if (householdId) reorderStorageLocations(householdId, ids);
            }}
          />
        </section>

        {/* 店舗管理 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-1">
            <StoreIcon size={14} />
            店舗管理
          </h2>
          <p className="text-xs text-gray-400 mb-2">ドラッグして並び替えできます</p>
          <DraggableList
            items={stores}
            addPlaceholder="店舗名"
            onAdd={async (name) => {
              if (!householdId) return;
              const { id } = await addStore(householdId, name, null);
              if (id) {
                await fetchStores(householdId);
                toast.success('店舗を追加しました');
              } else {
                toast.error('追加に失敗しました');
              }
            }}
            onDelete={async (id, name) => {
              if (!confirm(`「${name}」を削除しますか？この店舗に関連する購入履歴の店舗は「不明」になります。`)) return;
              const { success } = await deleteStore(id);
              if (success) {
                if (householdId) fetchStores(householdId);
                toast.success('削除しました');
              }
            }}
            onReorder={(ids) => {
              if (householdId) reorderStores(householdId, ids);
            }}
          />
        </section>

        {/* 単位候補管理 */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-1">
            <Ruler size={14} />
            単位候補管理
          </h2>
          <p className="text-xs text-gray-400 mb-2">ドラッグして並び替えできます</p>
          <DraggableList
            items={units}
            addPlaceholder="単位名（例: 束）"
            onAdd={async (name) => {
              if (!householdId) return;
              const { success } = await addUnit(householdId, name, units.length + 1);
              if (success) toast.success('単位を追加しました');
              else toast.error('追加に失敗しました');
            }}
            onDelete={async (id, name) => {
              if (!confirm(`「${name}」を削除しますか？`)) return;
              const { success } = await deleteUnit(id);
              if (success) {
                if (householdId) fetchUnits(householdId);
                toast.success('削除しました');
              }
            }}
            onReorder={(ids) => {
              if (householdId) reorderUnits(householdId, ids);
            }}
          />
        </section>

        {/* 通知設定（プレースホルダ） */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <Bell size={14} />
            通知設定
          </h2>
          <div className="space-y-3 opacity-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">在庫不足通知</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">賞味期限通知</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">買い物リマインダー</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ※ 通知機能は将来バージョンで対応予定
          </p>
        </section>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-medium text-sm"
        >
          <LogOut size={16} />
          ログアウト
        </button>

        {/* バージョン情報 */}
        <p className="text-center text-xs text-gray-300">
          PantryGo v0.1.0 (MVP)
        </p>
      </div>
    </div>
  );
}
