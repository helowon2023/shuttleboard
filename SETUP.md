# シャトルボード セットアップ手順

## 1. Node.js のインストール

https://nodejs.org/ から LTS版をダウンロードしてインストール

## 2. 依存パッケージのインストール

```bash
cd shuttleboard
npm install
```

## 3. Supabase プロジェクト作成

1. https://supabase.com にアクセス → 新しいプロジェクト作成
2. `supabase_schema.sql` の内容を SQL Editor で実行
3. Authentication → Email/Password を有効化
4. ユーザーを招待（管理者アカウント作成）

## 4. 環境変数の設定

`.env.local` を編集:

```
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon key
NEXT_PUBLIC_APP_URL=https://shuttleboard.vercel.app
```

Supabase の Settings → API から取得できます。

## 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

## 6. Vercel デプロイ

```bash
npx vercel --prod
```

環境変数を Vercel ダッシュボードにも設定すること。

## 使い方

1. `/login` で管理者ログイン
2. `/admin/setup` で大会作成（4ステップ）
3. 大会当日: `/admin/matches` でスコア入力
4. 観客・選手: QRコードから速報閲覧
