import Link from 'next/link'

interface PhaseGuideProps {
  step: string
  description: string
  href: string
}

export function PhaseGuide({ step, description, href }: PhaseGuideProps) {
  return (
    <Link href={href} className="block bg-primary/10 border border-primary/30 rounded-2xl p-4 hover:bg-primary/20 transition-colors">
      <div className="text-xs text-primary font-bold mb-1">次のステップ</div>
      <div className="font-bold text-primary">{step}</div>
      <div className="text-sm text-gray-600 mt-1">{description}</div>
      <div className="text-primary text-sm mt-2 font-medium">→ 開始する</div>
    </Link>
  )
}
