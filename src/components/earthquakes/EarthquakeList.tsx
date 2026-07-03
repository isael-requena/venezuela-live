/** Sidebar panel listing recent earthquakes, newest first. */

import { useMemo, useState, type ReactNode } from 'react'
import { Panel } from '../common/Panel'
import { StatusBadge } from '../common/StatusBadge'
import { StateMessage } from '../common/StateMessage'
import { IconQuake } from '../common/icons'
import type { AsyncState } from '../../types/asyncState'
import type { Earthquake } from '../../types/domain'
import { formatRelativeTime, magnitudeColor } from '../../utils/format'

interface EarthquakeListProps {
  readonly state: AsyncState<Earthquake[]>
  /** Open the detail modal for a quake. */
  readonly onSelect: (quake: Earthquake) => void
}

/** Minimum-magnitude filter options. */
const MAGNITUDE_FILTERS: ReadonlyArray<{ label: string; min: number }> = [
  { label: 'Todos', min: 0 },
  { label: '≥ 3', min: 3 },
  { label: '≥ 4', min: 4 },
  { label: '≥ 5', min: 5 },
]

/** Single row describing one seismic event. */
function EarthquakeRow({
  quake,
  onSelect,
}: {
  readonly quake: Earthquake
  readonly onSelect: (quake: Earthquake) => void
}): ReactNode {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(quake)}
        className="flex w-full items-center gap-3 rounded-xl bg-white/[0.04] px-2 py-2 text-left transition-colors hover:bg-white/[0.08]"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black shadow-lg"
          style={{ backgroundColor: magnitudeColor(quake.magnitude), boxShadow: `0 0 14px ${magnitudeColor(quake.magnitude)}66` }}
        >
          {quake.magnitude.toFixed(1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-slate-200">{quake.place}</span>
          <span className="block text-xs text-slate-500">
            {formatRelativeTime(quake.time)} · {quake.depthKm.toFixed(0)} km
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * @param props - {@link EarthquakeListProps}.
 */
export function EarthquakeList({ state, onSelect }: EarthquakeListProps): ReactNode {
  const { data, isLoading, error, lastUpdated, refresh } = state
  const [minMagnitude, setMinMagnitude] = useState(0)

  const quakes = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () => quakes.filter((quake) => quake.magnitude >= minMagnitude),
    [quakes, minMagnitude],
  )

  return (
    <Panel
      title="Sismos recientes"
      icon={<IconQuake className="h-4 w-4 text-sky-300" />}
      action={<StatusBadge isLoading={isLoading} error={error} lastUpdated={lastUpdated} onRefresh={refresh} />}
    >
      <div className="mb-3 flex gap-1 rounded-xl bg-white/5 p-1">
        {MAGNITUDE_FILTERS.map((filter) => (
          <button
            key={filter.min}
            type="button"
            onClick={() => setMinMagnitude(filter.min)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              minMagnitude === filter.min ? 'bg-sky-500/25 text-sky-200' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error !== null && quakes.length === 0 ? (
        <StateMessage variant="error" message={error} />
      ) : isLoading && quakes.length === 0 ? (
        <StateMessage variant="loading" message="Cargando sismos…" />
      ) : filtered.length === 0 ? (
        <StateMessage variant="empty" message="Sin sismos para este filtro." />
      ) : (
        <ul className="space-y-0.5">
          {filtered.map((quake) => (
            <EarthquakeRow key={quake.id} quake={quake} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
