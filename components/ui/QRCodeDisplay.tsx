'use client'
import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  slug: string
  size?: number
}

export function QRCodeDisplay({ slug, size = 200 }: QRCodeDisplayProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app')
  const url = `${appUrl}/${slug}`

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl shadow-xl">
      <QRCodeSVG value={url} size={size} />
      <p className="text-sm text-gray-600 break-all text-center">{url}</p>
      <button
        onClick={() => window.print()}
        className="no-print bg-primary text-white rounded-xl px-6 py-3 font-bold"
      >
        QRコードを印刷
      </button>
    </div>
  )
}
