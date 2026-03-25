/**
 * 在庫状態バッジ
 * 十分(緑)・少ない(黄)・なし(赤)を色で表示
 */
import type { StockStatus } from '@/types/database';
import { STOCK_STATUS_CONFIG } from '@/utils/constants';
import { cn } from '@/utils/helpers';

interface StockBadgeProps {
  status: StockStatus;
  /** コンパクト表示（ドットのみ） */
  compact?: boolean;
}

export function StockBadge({ status, compact = false }: StockBadgeProps) {
  const config = STOCK_STATUS_CONFIG[status];

  if (compact) {
    return <span className={cn('w-2.5 h-2.5 rounded-full inline-block', config.dot)} />;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.color
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
