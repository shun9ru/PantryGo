/**
 * 認証状態管理ストア
 *
 * DEV_MODE = true の場合、Supabase Authをスキップしてデモユーザーで動作する。
 * 本番運用時は DEV_MODE を false に変更すること。
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

/** 開発モード: true で認証をスキップ */
const DEV_MODE = true;

/** デモ用の固定ID */
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000002';

interface AuthState {
  /** 現在のSupabaseユーザー */
  user: SupabaseUser | null;
  /** セッション */
  session: Session | null;
  /** 初期化完了フラグ */
  initialized: boolean;
  /** ローディング状態 */
  loading: boolean;
  /** 現在のユーザーの世帯ID */
  householdId: string | null;

  /** 認証状態を初期化 */
  initialize: () => Promise<void>;
  /** メールでサインアップ */
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** メールでログイン */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** ログアウト */
  signOut: () => Promise<void>;
  /** 世帯IDを取得 */
  fetchHouseholdId: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  initialized: false,
  loading: false,
  householdId: null,

  initialize: async () => {
    if (DEV_MODE) {
      // 開発モード: デモユーザーで即ログイン
      // デモデータがなければ作成する
      await setupDemoData();
      set({
        user: { id: DEMO_USER_ID, email: 'admin@pantrygo.local' } as SupabaseUser,
        initialized: true,
        householdId: DEMO_HOUSEHOLD_ID,
      });
      return;
    }

    // 本番モード: Supabase Authを使用
    const { data: { session } } = await supabase.auth.getSession();
    set({
      user: session?.user ?? null,
      session,
      initialized: true,
    });

    if (session?.user) {
      await get().fetchHouseholdId();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null, session });
      if (session?.user) {
        await get().fetchHouseholdId();
      } else {
        set({ householdId: null });
      }
    });
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (DEV_MODE) {
      // 開発モードではログアウトしない
      return;
    }
    await supabase.auth.signOut();
    set({ user: null, session: null, householdId: null });
  },

  fetchHouseholdId: async () => {
    const { data } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', get().user?.id ?? '')
      .limit(1)
      .single();

    if (data) {
      set({ householdId: data.household_id });
    }
  },
}));

/**
 * デモ用データをセットアップ
 * RLSをバイパスするため、テーブルにデータがなければ挿入する
 */
async function setupDemoData() {
  // usersテーブルにデモユーザーがあるか確認
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', DEMO_USER_ID)
    .maybeSingle();

  if (existingUser) return; // 既にある

  // デモユーザー作成
  await supabase.from('users').insert({
    id: DEMO_USER_ID,
    name: '管理者',
    email: 'admin@pantrygo.local',
  });

  // デモ世帯作成
  await supabase.from('households').insert({
    id: DEMO_HOUSEHOLD_ID,
    name: 'マイホーム',
    owner_user_id: DEMO_USER_ID,
  });

  // 世帯メンバー追加
  await supabase.from('household_members').insert({
    household_id: DEMO_HOUSEHOLD_ID,
    user_id: DEMO_USER_ID,
    role: 'owner',
  });

  // デフォルトカテゴリ
  const categories = [
    '野菜・果物', '肉・魚', '乳製品・卵', '調味料', '飲料',
    '冷凍食品', 'お菓子', '日用品', '洗剤・衛生用品', 'その他',
  ];
  await supabase.from('categories').insert(
    categories.map((name, i) => ({
      household_id: DEMO_HOUSEHOLD_ID,
      name,
      sort_order: i + 1,
    }))
  );

  // 設定
  await supabase.from('settings').insert({
    user_id: DEMO_USER_ID,
  });
}
