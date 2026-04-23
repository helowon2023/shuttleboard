-- =====================================================
-- シャトルボード Row Level Security (RLS) 設定
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- RLS を有効化
ALTER TABLE tournaments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubbers      ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 既存ポリシーを削除（再実行時のエラー防止）
-- =====================================================
DROP POLICY IF EXISTS "public read" ON tournaments;
DROP POLICY IF EXISTS "auth write"  ON tournaments;
DROP POLICY IF EXISTS "public read" ON categories;
DROP POLICY IF EXISTS "auth write"  ON categories;
DROP POLICY IF EXISTS "public read" ON blocks;
DROP POLICY IF EXISTS "auth write"  ON blocks;
DROP POLICY IF EXISTS "public read" ON entries;
DROP POLICY IF EXISTS "auth write"  ON entries;
DROP POLICY IF EXISTS "public read" ON matches;
DROP POLICY IF EXISTS "auth write"  ON matches;
DROP POLICY IF EXISTS "public read" ON teams;
DROP POLICY IF EXISTS "auth write"  ON teams;
DROP POLICY IF EXISTS "public read" ON ties;
DROP POLICY IF EXISTS "auth write"  ON ties;
DROP POLICY IF EXISTS "public read" ON rubbers;
DROP POLICY IF EXISTS "auth write"  ON rubbers;

-- =====================================================
-- 速報閲覧：誰でもSELECT可能（QRコードからのアクセス用）
-- =====================================================
CREATE POLICY "public read" ON tournaments FOR SELECT USING (true);
CREATE POLICY "public read" ON categories  FOR SELECT USING (true);
CREATE POLICY "public read" ON blocks      FOR SELECT USING (true);
CREATE POLICY "public read" ON entries     FOR SELECT USING (true);
CREATE POLICY "public read" ON matches     FOR SELECT USING (true);
CREATE POLICY "public read" ON teams       FOR SELECT USING (true);
CREATE POLICY "public read" ON ties        FOR SELECT USING (true);
CREATE POLICY "public read" ON rubbers     FOR SELECT USING (true);

-- =====================================================
-- 管理操作：ログイン済みユーザーのみ INSERT/UPDATE/DELETE
-- =====================================================
CREATE POLICY "auth write" ON tournaments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON categories FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON blocks FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON entries FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON matches FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON teams FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON ties FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "auth write" ON rubbers FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Realtime（リアルタイム速報に必要）
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE rubbers;
ALTER PUBLICATION supabase_realtime ADD TABLE ties;
