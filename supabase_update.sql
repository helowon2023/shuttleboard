-- =====================================================
-- シャトルボード スキーマ更新SQL
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- カテゴリ: セット数設定（1セットマッチ or 3セットマッチ）
ALTER TABLE categories ADD COLUMN IF NOT EXISTS max_sets int DEFAULT 1;

-- チーム: メンバー一覧（改行区切りテキスト）
ALTER TABLE teams ADD COLUMN IF NOT EXISTS members text;

-- 個人戦マッチ: ゲーム別スコア
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score1_g2 int;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score1_g3 int;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score2_g2 int;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score2_g3 int;

-- 団体戦ラバー: ゲーム別スコア
ALTER TABLE rubbers ADD COLUMN IF NOT EXISTS score1_g2 int;
ALTER TABLE rubbers ADD COLUMN IF NOT EXISTS score1_g3 int;
ALTER TABLE rubbers ADD COLUMN IF NOT EXISTS score2_g2 int;
ALTER TABLE rubbers ADD COLUMN IF NOT EXISTS score2_g3 int;
