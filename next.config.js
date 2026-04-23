/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // 本番ソースマップを無効化（パフォーマンス向上）
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig
