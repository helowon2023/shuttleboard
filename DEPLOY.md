# シャトルボード デプロイ手順

## 初回デプロイ

### ステップ1: GitHubにリポジトリを作る

1. **https://github.com** にアクセスしてログイン（アカウントがなければ無料登録）
2. 右上の「＋」→「New repository」をクリック
3. Repository name: `shuttleboard`（任意）
4. **Private** を選択（URLを知らない人に見られたくない場合）
5. 「Create repository」をクリック

### ステップ2: パソコンでGitを初期化してpush

コマンドプロンプト（またはターミナル）でプロジェクトフォルダに移動して実行：

```bash
cd "C:\Users\aki56\Desktop\Google フォト\shuttleboard"

# Gitを初期化
git init

# 全ファイルをステージング
git add .

# 最初のコミット
git commit -m "初回コミット: シャトルボード"

# mainブランチに設定
git branch -M main

# GitHubリポジトリを登録（URLはGitHubのページからコピー）
git remote add origin https://github.com/あなたのユーザー名/shuttleboard.git

# GitHubにアップロード
git push -u origin main
```

### ステップ3: Vercelアカウント作成

1. **https://vercel.com** にアクセス
2. 「Sign Up」→「Continue with GitHub」でGitHubアカウントでログイン

### ステップ4: Vercelにデプロイ

1. Vercelダッシュボードで「**New Project**」をクリック
2. `shuttleboard` リポジトリを選択 →「Import」
3. **Environment Variables（環境変数）** に以下を追加：

   | 変数名 | 値 |
   |--------|-----|
   | `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SupabaseのPublishable key |
   | `NEXT_PUBLIC_APP_URL` | （まず空欄でOK、後で更新） |

   > Supabaseの値は: https://supabase.com → プロジェクト → Settings → API から取得

4. 「**Deploy**」をクリック → 2〜3分待つ

### ステップ5: デプロイ後の設定

#### VercelのURLを確認
デプロイ完了画面に `https://shuttleboard-xxxx.vercel.app` のようなURLが表示されます。

#### NEXT_PUBLIC_APP_URL を更新
1. Vercel → プロジェクト → Settings → Environment Variables
2. `NEXT_PUBLIC_APP_URL` の値を実際のURLに変更
3. 「Redeploy」（再デプロイ）を実行

#### SupabaseのSite URLを更新
1. Supabase ダッシュボード → Authentication → URL Configuration
2. **Site URL**: `https://shuttleboard-xxxx.vercel.app`
3. **Redirect URLs**: `https://shuttleboard-xxxx.vercel.app/**` を追加
4. 「Save」をクリック

---

## 2回目以降の更新方法

コードを変更したら以下を実行するだけ（Vercelが自動でデプロイ）：

```bash
git add .
git commit -m "変更内容の説明"
git push
```

---

## 大会当日の注意事項

- **前日に必ず動作確認**してください
- Supabaseの無料プランは一定時間アクセスがないとスリープします。  
  大会1時間前にブラウザからアクセスしてウォームアップしてください
- **QRコードは本番URLで印刷**してください（`/admin/qr` ページから）
- スタッフ全員にログインID・パスワードを事前共有してください
- 大会前日にスマホブラウザで一通り操作確認を行ってください

---

## QRコード再生成

本番URLが決まったら `/admin/qr` ページから印刷できます。

---

## トラブルシューティング

### ログインできない
→ Supabaseの Site URL と Redirect URLs が正しいか確認

### データが表示されない
→ SupabaseのRLSポリシーが設定されているか確認（`supabase_rls.sql` を実行）

### ビルドエラーが出る
```bash
npm run build
```
でエラー内容を確認してください。

### スマホからアクセスできない（ローカル開発時）
```bash
# package.jsonの"dev"スクリプトを確認
# "next dev -H 0.0.0.0" になっていること
npm run dev
```
同じWi-FiでパソコンのローカルIPアドレス（例: 192.168.0.x:3000）にアクセス

---

## 環境変数一覧

| 変数名 | 説明 | 例 |
|--------|------|----|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開キー | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | 本番アプリURL | `https://shuttleboard.vercel.app` |
