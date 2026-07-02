/** Minimal glassmorphism toast anchored top-center; auto-dismisses. */

import { useEffect, type ReactNode } from 'react'
import { IconGlobe } from './icons'

interface ToastProps {
  /** Message to show, or null to render nothing. */
  readonly message: string | null
  /** Called to clear the toast (on timeout). */
  readonly onDismiss: () => void
  /** Auto-dismiss delay in ms. */
  readonly durationMs?: number
}

/**
 * @param props - {@link ToastProps}.
 */
export function Toast({ message, onDismiss, durationMs = 4200 }: ToastProps): ReactNode {
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  if (message === null) return null

  return (
    <div className="animate-fade-in pointer-events-none absolute top-24 left-1/2 z-[700] -translate-x-1/2 px-3">
      <div className="glass-strong flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm text-slate-100 shadow-2xl">
        <IconGlobe className="h-4 w-4 shrink-0 text-sky-300" />
        <span className="whitespace-nowrap">{message}</span>
      </div>
    </div>
  )
}
