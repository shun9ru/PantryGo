-- ============================================================
-- PantryGo データベーススキーマ
-- Supabase (PostgreSQL) 用
-- ============================================================

-- UUID生成関数を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ユーザープロフィール
-- Supabase Auth の auth.users を補完するテーブル
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. 世帯（家族共有の単位）
-- MVPでは1ユーザー1世帯だが、将来の家族共有に備える
-- ============================================================
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'マイホーム',
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. 世帯メンバー
-- 将来の家族共有用。MVPでは所有者のみ
-- ============================================================
CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

-- ============================================================
-- 4. カテゴリ
-- 世帯ごとに管理（食品、日用品など）
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (household_id, name)
);

-- ============================================================
-- 5. 店舗
-- ============================================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  store_type TEXT,
  UNIQUE (household_id, name)
);

-- ============================================================
-- 6. 商品
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  brand TEXT,
  unit TEXT NOT NULL DEFAULT '個',
  barcode TEXT,
  storage_location TEXT,
  is_expiry_managed BOOLEAN NOT NULL DEFAULT FALSE,
  min_stock_threshold INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 商品名検索用インデックス
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_household ON products(household_id);
CREATE INDEX idx_products_category ON products(category_id);

-- ============================================================
-- 7. 在庫
-- 商品ごとに1レコード（1対1）
-- ============================================================
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  current_quantity INT NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'out' CHECK (stock_status IN ('sufficient', 'low', 'out')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_status ON inventory(stock_status);

-- ============================================================
-- 8. 買い物リスト
-- ============================================================
CREATE TABLE shopping_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  planned_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased')),
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  purchased_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purchased_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_list_household ON shopping_list(household_id);
CREATE INDEX idx_shopping_list_status ON shopping_list(status);

-- ============================================================
-- 9. 購入履歴
-- ============================================================
CREATE TABLE purchase_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price INT NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN quantity > 0 THEN price::NUMERIC / quantity ELSE 0 END
  ) STORED,
  is_sale BOOLEAN NOT NULL DEFAULT FALSE,
  memo TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_history_product ON purchase_history(product_id);
CREATE INDEX idx_purchase_history_store ON purchase_history(store_id);
CREATE INDEX idx_purchase_history_date ON purchase_history(purchase_date DESC);

-- ============================================================
-- 10. ユーザー設定
-- ============================================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  low_stock_notify BOOLEAN NOT NULL DEFAULT TRUE,
  expiry_notify BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_notify BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- RLS (Row Level Security) ポリシー
-- ユーザーは自分が属する世帯のデータのみアクセス可能
-- ============================================================

-- 全テーブルでRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ユーザーが属する世帯IDを取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- users: 自分のレコードのみ
CREATE POLICY "users_select" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = auth.uid());

-- households: 自分が属する世帯
CREATE POLICY "households_select" ON households FOR SELECT
  USING (id IN (SELECT get_my_household_ids()));
CREATE POLICY "households_insert" ON households FOR INSERT
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "households_update" ON households FOR UPDATE
  USING (owner_user_id = auth.uid());

-- household_members: 自分が属する世帯のメンバー
CREATE POLICY "hm_select" ON household_members FOR SELECT
  USING (household_id IN (SELECT get_my_household_ids()));
CREATE POLICY "hm_insert" ON household_members FOR INSERT
  WITH CHECK (household_id IN (SELECT get_my_household_ids()));

-- categories: 自分の世帯のカテゴリ
CREATE POLICY "categories_all" ON categories FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- stores: 自分の世帯の店舗
CREATE POLICY "stores_all" ON stores FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- products: 自分の世帯の商品
CREATE POLICY "products_all" ON products FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- inventory: 自分の世帯の商品の在庫
CREATE POLICY "inventory_all" ON inventory FOR ALL
  USING (product_id IN (
    SELECT id FROM products WHERE household_id IN (SELECT get_my_household_ids())
  ));

-- shopping_list: 自分の世帯の買い物リスト
CREATE POLICY "shopping_list_all" ON shopping_list FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- purchase_history: 自分の世帯の購入履歴
CREATE POLICY "purchase_history_all" ON purchase_history FOR ALL
  USING (household_id IN (SELECT get_my_household_ids()));

-- settings: 自分の設定
CREATE POLICY "settings_all" ON settings FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- トリガー: 新規ユーザー作成時に自動でプロフィール・世帯を作成
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_household_id UUID;
BEGIN
  -- usersテーブルにプロフィール作成
  INSERT INTO users (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);

  -- デフォルト世帯を作成
  INSERT INTO households (name, owner_user_id)
  VALUES ('マイホーム', NEW.id)
  RETURNING id INTO new_household_id;

  -- 世帯メンバーに追加
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (new_household_id, NEW.id, 'owner');

  -- デフォルトカテゴリを作成
  INSERT INTO categories (household_id, name, sort_order) VALUES
    (new_household_id, '野菜・果物', 1),
    (new_household_id, '肉・魚', 2),
    (new_household_id, '乳製品・卵', 3),
    (new_household_id, '調味料', 4),
    (new_household_id, '飲料', 5),
    (new_household_id, '冷凍食品', 6),
    (new_household_id, 'お菓子', 7),
    (new_household_id, '日用品', 8),
    (new_household_id, '洗剤・衛生用品', 9),
    (new_household_id, 'その他', 10);

  -- デフォルト設定を作成
  INSERT INTO settings (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users に新規挿入されたらトリガー実行
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
