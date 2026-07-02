/** Sidebar panel listing aggregated news, filterable by origin and region. */

import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { Panel } from '../common/Panel'
import { StatusBadge } from '../common/StatusBadge'
import { StateMessage } from '../common/StateMessage'
import { IconNews, IconRss, IconTelegram, IconReddit, IconYoutube } from '../common/icons'
import { VENEZUELA_REGIONS } from '../../config/regions'
import type { AsyncState } from '../../types/asyncState'
import type { NewsItem, NewsPlatform } from '../../types/domain'
import { formatRelativeTime } from '../../utils/format'

/** Origin filter tabs. */
type OriginFilter = 'all' | 'oficial' | 'social'

interface NewsPanelProps {
  readonly state: AsyncState<NewsItem[]>
  /** Active region filter id, or null for "all regions". */
  readonly selectedRegionId: string | null
  /** Change the active region filter. */
  readonly onSelectRegion: (regionId: string | null) => void
  /** Open the reader for an article. */
  readonly onSelectNews: (item: NewsItem) => void
}

const REGION_NAMES: ReadonlyMap<string, string> = new Map(
  VENEZUELA_REGIONS.map((region) => [region.id, region.name]),
)

const PLATFORM_ICON: Record<NewsPlatform, ComponentType<{ className?: string }>> = {
  rss: IconRss,
  telegram: IconTelegram,
  reddit: IconReddit,
  youtube: IconYoutube,
}

/** Brand tint per platform for the small source icon. */
const PLATFORM_COLOR: Record<NewsPlatform, string> = {
  rss: 'text-orange-400',
  telegram: 'text-sky-400',
  reddit: 'text-orange-500',
  youtube: 'text-red-500',
}

const ORIGIN_TABS: ReadonlyArray<{ id: OriginFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'oficial', label: 'Oficiales' },
  { id: 'social', label: 'Redes' },
]

/** Single news article row with optional thumbnail. */
function NewsRow({
  item,
  onSelect,
}: {
  readonly item: NewsItem
  readonly onSelect: (item: NewsItem) => void
}): ReactNode {
  const [imgFailed, setImgFailed] = useState(false)
  const regionName = item.regionId !== null ? REGION_NAMES.get(item.regionId) : null
  const PlatformIcon = PLATFORM_ICON[item.platform]
  const showImage = item.imageUrl !== null && !imgFailed

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        {showImage ? (
          <img
            src={item.imageUrl ?? ''}
            alt=""
            loading="lazy"
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5">
            <PlatformIcon className={`h-6 w-6 ${PLATFORM_COLOR[item.platform]}`} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-3 text-sm leading-snug font-medium text-slate-100">{item.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <PlatformIcon className={`h-3 w-3 ${PLATFORM_COLOR[item.platform]}`} />
              {item.sourceName}
            </span>
            <span>· {formatRelativeTime(item.publishedAt)}</span>
            {regionName !== undefined && regionName !== null && (
              <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-blue-300">{regionName}</span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * @param props - {@link NewsPanelProps}.
 */
export function NewsPanel({ state, selectedRegionId, onSelectRegion, onSelectNews }: NewsPanelProps): ReactNode {
  const { data, isLoading, error, lastUpdated, refresh } = state
  const [origin, setOrigin] = useState<OriginFilter>('all')

  const news = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () =>
      news.filter(
        (item) =>
          (origin === 'all' || item.category === origin) &&
          (selectedRegionId === null || item.regionId === selectedRegionId),
      ),
    [news, origin, selectedRegionId],
  )

  const selectedName = selectedRegionId !== null ? REGION_NAMES.get(selectedRegionId) : null

  return (
    <Panel
      title="Últimas noticias"
      icon={<IconNews className="h-4 w-4 text-sky-300" />}
      action={<StatusBadge isLoading={isLoading} error={error} lastUpdated={lastUpdated} onRefresh={refresh} />}
    >
      <div className="mb-3 flex gap-1 rounded-xl bg-white/5 p-1">
        {ORIGIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOrigin(tab.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              origin === tab.id ? 'bg-sky-500/25 text-sky-200' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedRegionId !== null && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
          <span>
            Zona: <strong>{selectedName ?? selectedRegionId}</strong>
          </span>
          <button type="button" onClick={() => onSelectRegion(null)} className="underline hover:text-white">
            Ver todas
          </button>
        </div>
      )}

      {error !== null && news.length === 0 ? (
        <StateMessage variant="error" message={error} />
      ) : isLoading && news.length === 0 ? (
        <StateMessage variant="loading" message="Cargando noticias…" />
      ) : filtered.length === 0 ? (
        <StateMessage variant="empty" message="No hay noticias para este filtro." />
      ) : (
        <ul className="space-y-1">
          {filtered.map((item) => (
            <NewsRow key={item.id} item={item} onSelect={onSelectNews} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
