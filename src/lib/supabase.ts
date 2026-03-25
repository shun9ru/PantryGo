/**
 * Supabaseクライアントの初期化
 * 環境変数からURL・キーを取得して接続
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 環境変数が設定されていない場合のガード
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase環境変数が設定されていません。.envファイルを確認してください。'
  );
}

/** Supabaseクライアントインスタンス */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
