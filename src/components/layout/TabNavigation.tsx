/**
 * 下部タブナビゲーション
 * スマホ操作を想定した5タブ構成
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, Receipt, Settings } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useShoppingStore } from '@/stores/shoppingStore';

/** タブ定義 */
const tabs = [
  { path: '/', label: 'ホーム', icon: Home },
  { path: '/inventory', label: '在庫', icon: Package },
  { path: '/shopping', label: '買い物', icon: ShoppingCart },
  { path: '/history', label: '履歴', icon: Receipt },
  { path: '/settings', label: '設定', icon: Settings },
] as const;

export function TabNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingCount = useShoppingStore((s) => s.getPendingCount());

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 pt-3 relative',
                isActive ? 'text-emerald-600' : 'text-gray-400'
              )}
            >
              <div className="relative">
                <Icon size={22} />
                {/* 買い物タブに未購入バッジ */}
                {tab.path === '/shopping' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>
      {/* iPhoneのセーフエリア対応 */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
