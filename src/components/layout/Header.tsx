/** Application top bar with branding, mission statement and connectivity state. */

import type { ReactNode } from 'react'
import { IconGithub, IconHeart } from '../common/icons'

interface HeaderProps {
  /** Whether the browser currently has connectivity. */
  readonly isOnline: boolean
}

const AUTHOR_URL = 'https://github.com/isael-requena'

/**
 * Presentational header. Shows an online/offline badge so the user knows
 * whether the displayed data is live or served from cache.
 *
 * @param props - {@link HeaderProps}.
 */
export function Header({ isOnline }: HeaderProps): ReactNode {
  return (
    <header className="flex items-center justify-between gap-2 px-1">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <span
          className="inline-block h-6 w-9 shrink-0 rounded-sm shadow-lg sm:h-7 sm:w-10"
          style={{ background: 'linear-gradient(to bottom, #fcd34d 33%, #2563eb 33% 66%, #dc2626 66%)' }}
          aria-hidden
        />
        <div className="min-w-0">
          <h1 className="neon-text text-base leading-tight font-bold text-white sm:text-lg">
            Venezuela en Vivo
          </h1>
          <p className="text-[11px] leading-snug text-slate-400 sm:text-xs">
            Sismos, dólar y noticias en tiempo real
          </p>
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 flex w-fit items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-slate-300 lg:hidden"
          >
            <IconGithub className="h-3 w-3" /> Hecho por Isael Requena{' '}
            <IconHeart className="h-2.5 w-2.5 text-red-400" />
          </a>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Desarrollado con ❤️ por Isael Jafeth Requena"
          className="hidden items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white lg:flex"
        >
          <IconGithub className="h-3.5 w-3.5" />
          Isael Requena <IconHeart className="h-3 w-3 text-red-400" />
        </a>

        <div
          className={`hidden items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-medium sm:px-3 lg:flex ${
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
      </div>
    </header>
  )
}
