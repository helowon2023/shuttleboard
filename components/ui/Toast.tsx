'use client'
import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 2000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: 'bg-done text-white',
    error: 'bg-in-progress text-white',
    info: 'bg-primary text-white',
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️' }

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl ${colors[type]} animate-bounce-in`}>
      <span>{icons[type]}</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ message, type })
  }

  function ToastContainer() {
    if (!toast) return null
    return <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  }

  return { showToast, ToastContainer }
}
