/**
 * ドラッグ&ドロップで並び替え可能なリスト
 * カテゴリ・保管場所など、名前+並び順を持つリストで共通利用
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';

interface DraggableItem {
  id: string;
  name: string;
}

interface DraggableListProps {
  /** 表示するアイテム一覧 */
  items: DraggableItem[];
  /** 並び替え確定時のコールバック（新しい順序のID配列） */
  onReorder: (orderedIds: string[]) => void;
  /** 削除時のコールバック */
  onDelete: (id: string, name: string) => void;
  /** 追加時のコールバック */
  onAdd: (name: string) => void;
  /** 追加フォームのプレースホルダ */
  addPlaceholder?: string;
}

export function DraggableList({
  items,
  onReorder,
  onDelete,
  onAdd,
  addPlaceholder = '名前を入力',
}: DraggableListProps) {
  const [localItems, setLocalItems] = useState<DraggableItem[]>(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const dragItemRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 親から渡されるitemsが変わったらローカルを同期
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const commitReorder = useCallback(
    (reordered: DraggableItem[]) => {
      setLocalItems(reordered);
      onReorder(reordered.map((item) => item.id));
    },
    [onReorder]
  );

  // --- マウス用ドラッグ ---
  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };

  const handleDrop = (index: number) => {
    const from = dragItemRef.current;
    if (from === null || from === index) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const reordered = [...localItems];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(index, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    commitReorder(reordered);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // --- タッチ用ドラッグ ---
  const handleTouchStart = (index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragItemRef.current === null || !listRef.current) return;
    const touchY = e.touches[0].clientY;
    const itemEls = listRef.current.querySelectorAll('[data-drag-item]');

    for (let i = 0; i < itemEls.length; i++) {
      const rect = itemEls[i].getBoundingClientRect();
      if (touchY >= rect.top && touchY <= rect.bottom) {
        setOverIndex(i);
        break;
      }
    }
  };

  const handleTouchEnd = () => {
    const from = dragItemRef.current;
    const to = overIndex;
    if (from === null || to === null || from === to) {
      setDragIndex(null);
      setOverIndex(null);
      dragItemRef.current = null;
      return;
    }
    const reordered = [...localItems];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    dragItemRef.current = null;
    commitReorder(reordered);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
    setShowAddForm(false);
  };

  return (
    <div>
      {/* 追加ボタン・フォーム */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-emerald-600"
        >
          <Plus size={18} />
        </button>
      </div>

      {showAddForm && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={addPlaceholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
          >
            追加
          </button>
        </div>
      )}

      {/* リスト */}
      <div ref={listRef} className="space-y-1">
        {localItems.map((item, index) => (
          <div
            key={item.id}
            data-drag-item
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors select-none ${
              dragIndex === index
                ? 'opacity-50 bg-gray-100'
                : overIndex === index && dragIndex !== null
                  ? 'bg-emerald-50 border border-emerald-300 border-dashed'
                  : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-gray-300 cursor-grab active:cursor-grabbing touch-none">
                <GripVertical size={16} />
              </span>
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <button
              onClick={() => onDelete(item.id, item.name)}
              className="p-1 text-gray-300 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
