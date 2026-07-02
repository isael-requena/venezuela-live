/** Application top bar with branding, mission statement and connectivity state. */

import type { ReactNode } from 'react'

interface HeaderProps {
  /** Whether the browser currently has connectivity. */
  readonly isOnline: boolean
}

/**
 * Presentational header. Shows an online/offline badge so the user knows
 * whether the displayed data is live or served from cache.
 *
 * @param props - {@link HeaderProps}.
 */
export function Header({ isOnline }: HeaderProps): ReactNode {
  return (
    <header className="flex items-center justify-between gap-3 px-1">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span
          className="inline-block h-6 w-9 shrink-0 rounded-sm shadow-lg sm:h-7 sm:w-10"
          style={{ background: 'linear-gradient(to bottom, #fcd34d 33%, #2563eb 33% 66%, #dc2626 66%)' }}
          aria-hidden
        />
        <div className="min-w-0">
          <h1 className="neon-text truncate text-base leading-tight font-bold text-white sm:text-lg">
            Venezuela en Vivo
          </h1>
          <p className="truncate text-[11px] text-slate-400 sm:text-xs">
            Sismos, dólar y noticias en tiempo real
          </p>
        </div>
      </div>

      <div
        className={`flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium sm:px-3 ${
          isOnline ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
        }`}
        title={isOnline ? 'Conectado: datos en vivo' : 'Sin conexión: mostrando datos guardados'}
      >
        <span
          className={`h-2 w-2 rounded-full ${isOnline ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'}`}
          aria-hidden
        />
        {isOnline ? 'En vivo' : 'Offline'}
      </div>
    </header>
  )
}
