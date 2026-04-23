'use client'

interface PrintButtonProps {
  label?: string
  className?: string
}

export function PrintButton({ label = '印刷', className = '' }: PrintButtonProps) {
  return (
    <button
      onClick={() => window.print()}
      className={className || 'text-sm bg-gray-100 text-gray-700 rounded-xl px-3 py-2 no-print'}
    >
      {label}
    </button>
  )
}
