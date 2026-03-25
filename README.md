# PantryGo - 家庭の食材・日用品管理アプリ

家庭内の在庫管理、買い物リスト作成、購入価格履歴の蓄積、店舗別価格比較をスマホで使いやすく実現するWebアプリです。

## 技術スタック

| 技術 | 用途 |
|------|------|
| React 19 + TypeScript | フロントエンド |
| Vite 8 | ビルドツール |
| Tailwind CSS 4 | スタイリング |
| Zustand | 状態管理 |
| Supabase | バックエンド (DB / Auth / RLS) |
| React Router v7 | ルーティング |
| Lucide React | アイコン |
| react-hot-toast | 通知 |

## ディレクトリ構成

```
src/
├── components/
│   ├── common/          # 汎用UIコンポーネント
│   └── layout/          # レイアウトコンポーネント
├── hooks/               # カスタムフック（将来用）
├── lib/
│   └── supabase.ts      # Supabaseクライアント
├── pages/               # 画面コンポーネント
├── stores/              # Zustandストア
├── types/               # TypeScript型定義
├── utils/               # ユーティリティ・定数
├── App.tsx              # ルーティング定義
├── main.tsx             # エントリポイント
└── index.css            # グローバルCSS
supabase/
└── schema.sql           # DB定義SQL (RLS・トリガー込み)
```

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [Supabase](https://supabase.com) でアカウント作成・新規プロジェクト作成
2. **SQL Editor** で `supabase/schema.sql` を実行
3. **Settings > API** から以下を取得:
   - Project URL
   - anon public key

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. ローカル起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:5173 を開く。

### 4. 認証の設定

Supabaseダッシュボードで:
- **Authentication > Settings** でメール認証を有効化
- 開発時は「Confirm email」をOFFにすると即ログイン可能

## Vercel デプロイ手順

1. GitHubリポジトリにプッシュ
2. [Vercel](https://vercel.com) でリポジトリをインポート
3. 環境変数を設定:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. デプロイ実行（ビルドコマンド: `npm run build`、出力: `dist`）

## MVP機能一覧

- **商品管理**: 登録・編集・検索・カテゴリ絞り込み
- **在庫管理**: 数量管理、3段階状態表示（十分/少ない/なし）
- **買い物リスト**: 追加（自動 + 手動）、優先度、購入完了
- **購入履歴**: 記録、商品/店舗絞り込み
- **価格比較**: 店舗別最安値、平均価格、最新価格
- **認証**: メールログイン / サインアップ

## 画面一覧

| 画面 | パス | 説明 |
|------|------|------|
| ログイン | `/login` | メール認証 |
| ホーム | `/` | ダッシュボード |
| 商品一覧 | `/products` | 検索・絞り込み |
| 商品追加 | `/products/new` | 新規登録 |
| 商品詳細 | `/products/:id` | 情報・価格比較 |
| 商品編集 | `/products/:id/edit` | 編集 |
| 在庫管理 | `/inventory` | 数量操作 |
| 買い物リスト | `/shopping` | 未購入/購入済み |
| 購入記録 | `/purchase/new` | 購入登録 |
| 購入履歴 | `/history` | 履歴一覧 |
| 設定 | `/settings` | カテゴリ・通知 |

## 業務ロジック

### 在庫状態判定
- `数量 > 閾値` → 十分（緑）
- `1 <= 数量 <= 閾値` → 少ない（黄）
- `数量 = 0` → なし（赤）

### 買い物リスト重複防止
同一商品（product_id一致）が未購入状態で既に存在する場合は追加をブロック。
手動追加（product_idなし）は同名でも追加可能。

### 購入完了時の処理
1. 買い物リストを「購入済み」に更新
2. 購入履歴を追加
3. 在庫数を加算更新

## 将来の拡張案

- 賞味期限/使用期限管理・通知
- 家族共有（household_members活用）
- Push通知（在庫不足、期限切れ）
- バーコード読み取り（quagga.js等）
- レシートOCR（Tesseract.js等）
- 価格推移グラフ（recharts等）
- レポート・月次集計
- 定期購入リマインダー

## ライセンス

Private
