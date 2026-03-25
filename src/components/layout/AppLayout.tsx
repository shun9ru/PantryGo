/**
 * アプリ全体のレイアウト
 * ヘッダー + メインコンテンツ + タブナビゲーション
 */
import { Outlet } from 'react-router-dom';
import { TabNavigation } from './TabNavigation';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      {/* メインコンテンツ（下部タブの分だけ余白を確保） */}
      <main className="pb-20">
        <Outlet />
      </main>
      <TabNavigation />
    </div>
  );
}
