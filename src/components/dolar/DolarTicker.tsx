/** Slim, always-visible exchange-rate ticker shown under the header. */

import type { ReactNode } from 'react'
import { IconMoney } from '../common/icons'
import type { AsyncState } from '../../types/asyncState'
import type { DolarRate } from '../../types/domain'
import { formatBs, formatRelativeTime } from '../../utils/format'

interface DolarTickerProps {
  readonly state: AsyncState<DolarRate[]>
}

const KIND_META: Record<DolarRate['kind'], { label: string; accent: string }> = {
  oficial: { label: 'BCV', accent: 'text-sky-300' },
  paralelo: { label: 'Paralelo', accent: 'text-amber-300' },
}

/**
 * @param props - {@link DolarTickerProps}.
 */
export function DolarTicker({ state }: DolarTickerProps): ReactNode {
  const { data, isLoading, error, lastUpdated } = state
  const rates = data ?? []

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-300 uppercase">
        <IconMoney className="h-4 w-4 text-emerald-300" />
        <span className="hidden sm:inline">Dólar hoy</span>
      </span>

      {rates.length === 0 ? (
        <span className="text-xs text-slate-500">
          {error !== null ? 'Sin datos de tasa' : 'Cargando tasa…'}
        </span>
      ) : (
        rates.map((rate) => {
          const meta = KIND_META[rate.kind]
          return (
            <span key={rate.kind} className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-[11px] tracking-wide text-slate-400 uppercase">{meta.label}</span>
              <span className={`text-base font-bold ${meta.accent}`}>{formatBs(rate.price)}</span>
            </span>
          )
        })
      )}

      <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-[11px] text-slate-500 sm:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${isLoading ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`} />
        {formatRelativeTime(lastUpdated)}
      </span>
    </div>
  )
}
