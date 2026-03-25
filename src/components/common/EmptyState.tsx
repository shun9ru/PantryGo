/**
 * 空データ表示コンポーネント
 * データがない場合のプレースホルダ
 */
import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon size={48} className="text-gray-300 mb-3" />
      <p className="text-gray-500 font-medium">{title}</p>
      {description && (
        <p className="text-gray-400 text-sm mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
