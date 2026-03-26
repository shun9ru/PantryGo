/**
 * ホイールピッカー（数値選択UI）
 * スマホで使いやすいスクロール選択
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface NumberWheelPickerProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function NumberWheelPicker({
  value,
  onChange,
  min = 0,
  max = 20,
  label = '数量を選択',
}: NumberWheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const scrollRef = useRef<HTMLDivElement>(null);

  const numbers = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  // モーダルを開いた時に現在値にスクロール
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const index = selectedValue - min;
      const itemHeight = 48; // h-12 = 48px
      scrollRef.current.scrollTop = index * itemHeight;
    }
  }, [isOpen, selectedValue, min]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollTop = scrollRef.current.scrollTop;
      const itemHeight = 48;
      const index = Math.round(scrollTop / itemHeight);
      const newValue = numbers[index];
      if (newValue !== undefined) {
        setSelectedValue(newValue);
      }
    }
  };

  const handleConfirm = () => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <>
      {/* 選択ボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      >
        <span className="text-2xl font-semibold text-gray-900">{value}</span>
      </button>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center sm:justify-center">
          {/* 背景クリックで閉じる */}
          <div
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />

          {/* モーダルコンテンツ */}
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md sm:mx-4 max-h-[80vh] flex flex-col">
            {/* ヘッダー（固定） */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* ピッカー（スクロール可能） */}
            <div className="flex-shrink-0 relative h-64 overflow-hidden">
              {/* 選択インジケーター */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y-2 border-emerald-600 pointer-events-none z-10 bg-emerald-50/30" />

              {/* スクロール可能な数値リスト */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll snap-y snap-mandatory px-4"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {/* 上部パディング */}
                <div className="h-24" />

                {/* 数値リスト */}
                {numbers.map((num) => (
                  <div
                    key={num}
                    className="h-12 flex items-center justify-center snap-center"
                  >
                    <span
                      className={`text-2xl font-semibold transition-all ${
                        num === selectedValue
                          ? 'text-gray-900 scale-110'
                          : 'text-gray-400 scale-90'
                      }`}
                    >
                      {num}
                    </span>
                  </div>
                ))}

                {/* 下部パディング */}
                <div className="h-24" />
              </div>

              {/* スクロールバー非表示 */}
              <style>{`
                .overflow-y-scroll::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
            </div>

            {/* 決定ボタン（固定） */}
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 pb-safe bg-white rounded-b-2xl">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors touch-manipulation"
              >
                決定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
