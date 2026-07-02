/** Compact live-status indicator: loading, error, or last-updated time. */

import type { ReactNode } from 'react'
import { formatRelativeTime } from '../../utils/format'

interface StatusBadgeProps {
  readonly isLoading: boolean
  readonly error: string | null
  readonly lastUpdated: number | null
  /** Imperative refresh handler. */
  readonly onRefresh: () => void
}

/**
 * Shows the freshness of a live resource and a manual refresh control.
 *
 * @param props - {@link StatusBadgeProps}.
 */
export function StatusBadge({ isLoading, error, lastUpdated, onRefresh }: StatusBadgeProps): ReactNode {
  const label = error !== null ? 'Error' : isLoading ? 'Actualizando…' : formatRelativeTime(lastUpdated)
  const dotClass = error !== null ? 'bg-red-500' : isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'

  return (
    <button
      type="button"
      onClick={onRefresh}
      title={error ?? 'Actualizar ahora'}
      className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
    >
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
      {label}
    </button>
  )
}
