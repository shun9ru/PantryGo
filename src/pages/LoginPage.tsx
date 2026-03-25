/**
 * ログインページ
 * メールアドレスとパスワードでログイン・新規登録
 */
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export function LoginPage() {
  const { signIn, signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください');
      return;
    }

    if (isSignUp) {
      if (password.length < 6) {
        toast.error('パスワードは6文字以上で入力してください');
        return;
      }
      const { error } = await signUp(email, password);
      if (error) {
        toast.error(error);
      } else {
        toast.success('確認メールを送信しました。メールを確認してください。');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">PantryGo</h1>
          <p className="text-sm text-gray-500 mt-1">家庭の食材・日用品管理</p>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="email@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="6文字以上"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
          </button>
        </form>

        {/* 切替リンク */}
        <p className="text-center text-sm text-gray-500 mt-4">
          {isSignUp ? 'アカウントをお持ちの方は' : 'アカウントをお持ちでない方は'}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-emerald-600 font-medium ml-1 hover:underline"
          >
            {isSignUp ? 'ログイン' : '新規登録'}
          </button>
        </p>
      </div>
    </div>
  );
}
