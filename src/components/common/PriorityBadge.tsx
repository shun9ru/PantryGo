/**
 * 優先度バッジ
 * 高(赤)・中(黄)・低(灰)を色で表示
 */
import type { ShoppingPriority } from '@/types/database';
import { PRIORITY_CONFIG } from '@/utils/constants';
import { cn } from '@/utils/helpers';

interface PriorityBadgeProps {
  priority: ShoppingPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        config.bg,
        config.color
      )}
    >
      {config.label}
    </span>
  );
}
