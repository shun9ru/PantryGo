/**
 * アプリケーションのルートコンポーネント
 * ルーティングと認証ガードを定義
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// ページコンポーネント
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { ProductListPage } from '@/pages/ProductListPage';
import { ProductFormPage } from '@/pages/ProductFormPage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ShoppingListPage } from '@/pages/ShoppingListPage';
import { PurchaseFormPage } from '@/pages/PurchaseFormPage';
import { PurchaseHistoryPage } from '@/pages/PurchaseHistoryPage';
import { SettingsPage } from '@/pages/SettingsPage';

/**
 * 認証ガード
 * ログインしていなければログイン画面にリダイレクト
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();

  if (!initialized) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export default function App() {
  const { initialize, initialized } = useAuthStore();

  // アプリ起動時に認証状態を初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🏠</div>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* トースト通知 */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2500,
          style: {
            borderRadius: '8px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
          },
        }}
      />

      <Routes>
        {/* ログイン（未認証） */}
        <Route path="/login" element={<LoginPage />} />

        {/* 認証済みルート */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/purchase/new" element={<PurchaseFormPage />} />
          <Route path="/history" element={<PurchaseHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 存在しないパスはホームへ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
