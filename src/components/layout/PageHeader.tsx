/**
 * ページヘッダー
 * タイトルと戻るボタンを表示
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  /** 戻るボタンを表示するか */
  showBack?: boolean;
  /** 右側に表示するアクション要素 */
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, rightAction }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
