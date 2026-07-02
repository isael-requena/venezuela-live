import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Header } from './components/layout/Header'
import { DolarTicker } from './components/dolar/DolarTicker'
import { EarthquakeMap, type MapFocus } from './components/map/EarthquakeMap'
import { EarthquakeList } from './components/earthquakes/EarthquakeList'
import { NewsPanel } from './components/news/NewsPanel'
import { NewsFlyout } from './components/news/NewsFlyout'
import { Toast } from './components/common/Toast'
import { IconNews, IconQuake } from './components/common/icons'
import { useEarthquakes } from './hooks/useEarthquakes'
import { useDolar } from './hooks/useDolar'
import { useNews } from './hooks/useNews'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { DEFAULT_ZOOM, VENEZUELA_CENTER } from './config/constants'
import { VENEZUELA_REGIONS, type Region } from './config/regions'
import type { Earthquake, NewsItem } from './types/domain'

const REGIONS_BY_ID: ReadonlyMap<string, Region> = new Map(
  VENEZUELA_REGIONS.map((region) => [region.id, region]),
)

/** Zoom levels used when flying to a selected item. */
const FLY_ZOOM = { region: 8, quake: 7 } as const

/** Which list is visible in the mobile bottom sheet. */
type MobileView = 'sismos' | 'news'

/**
 * Root application shell.
 *
 * The map is a full-bleed background; the UI floats above it as frosted-glass
 * cards (macOS style) so the map stays visible behind everything. On desktop
 * the cards are side columns; on mobile they collapse into a bottom sheet with
 * tabs. Selecting an earthquake opens a popover anchored to its marker; selecting
 * a news item opens a floating card over the map.
 */
function App(): ReactNode {
  const earthquakes = useEarthquakes()
  const dolar = useDolar()
  const news = useNews()
  const isOnline = useOnlineStatus()

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null)
  const [activeQuake, setActiveQuake] = useState<Earthquake | null>(null)
  const [mapFocus, setMapFocus] = useState<MapFocus | null>(null)
  const [mobileView, setMobileView] = useState<MobileView>('news')
  const [toast, setToast] = useState<string | null>(null)
  const nonceRef = useRef(0)

  /** Fly the map to a coordinate, forcing a re-trigger each call. */
  const flyTo = useCallback((coords: MapFocus['coords'], zoom: number) => {
    nonceRef.current += 1
    setMapFocus({ coords, zoom, nonce: nonceRef.current })
  }, [])

  const handleSelectNews = useCallback(
    (item: NewsItem) => {
      setActiveNews(item)
      const region = item.regionId !== null ? REGIONS_BY_ID.get(item.regionId) : undefined
      if (region !== undefined) {
        setToast(null)
        flyTo(region.coordinates, FLY_ZOOM.region)
      } else {
        // No specific state: zoom out to the whole country and tell the user.
        flyTo(VENEZUELA_CENTER, DEFAULT_ZOOM)
        setToast('Noticia de alcance nacional · no ubicada en un estado específico')
      }
    },
    [flyTo],
  )

  // Don't fly here: the popover's own autoPan brings the epicenter into view
  // below the floating header without fighting a concurrent flyTo animation.
  const handleSelectQuake = useCallback((quake: Earthquake) => {
    setActiveQuake(quake)
  }, [])

  const handleSelectRegion = useCallback(
    (regionId: string) => {
      setSelectedRegionId(regionId)
      setMobileView('news')
      const region = REGIONS_BY_ID.get(regionId)
      if (region !== undefined) flyTo(region.coordinates, FLY_ZOOM.region)
      const latest = (news.data ?? []).find((item) => item.regionId === regionId)
      if (latest !== undefined) setActiveNews(latest)
    },
    [flyTo, news.data],
  )

  const newsByRegion = useMemo<ReadonlyMap<string, number>>(() => {
    const counts = new Map<string, number>()
    for (const item of news.data ?? []) {
      if (item.regionId === null) continue
      counts.set(item.regionId, (counts.get(item.regionId) ?? 0) + 1)
    }
    return counts
  }, [news.data])

  const activeNewsRegionId = activeNews?.regionId ?? null
  const activeNewsRegionName =
    activeNewsRegionId !== null ? (REGIONS_BY_ID.get(activeNewsRegionId)?.name ?? null) : null

  const newsPanel = (
    <NewsPanel
      state={news}
      selectedRegionId={selectedRegionId}
      onSelectRegion={setSelectedRegionId}
      onSelectNews={handleSelectNews}
    />
  )
  const sismosPanel = <EarthquakeList state={earthquakes} onSelect={handleSelectQuake} />

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Full-bleed map background */}
      <div className="absolute inset-0">
        <EarthquakeMap
          earthquakes={earthquakes.data ?? []}
          newsByRegion={newsByRegion}
          highlightRegionId={activeNewsRegionId}
          focus={mapFocus}
          activeQuake={activeQuake}
          onSelectRegion={handleSelectRegion}
          onSelectEarthquake={handleSelectQuake}
          onCloseQuake={() => setActiveQuake(null)}
        />
      </div>

      {/* Floating glass UI layer (click-through except on the cards) */}
      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col gap-3 p-3">
        {/* Top bar */}
        <div className="glass pointer-events-auto flex flex-col gap-2 rounded-2xl px-4 py-2.5">
          <Header isOnline={isOnline} />
          <DolarTicker state={dolar} />
        </div>

        {/* Desktop: side columns with a map gap in the middle */}
        <div className="hidden min-h-0 flex-1 gap-3 lg:flex">
          <aside className="scroll-thin glass pointer-events-auto w-80 overflow-y-auto rounded-2xl p-3">
            {sismosPanel}
          </aside>
          <div className="flex-1" />
          <aside className="scroll-thin glass pointer-events-auto w-[380px] overflow-y-auto rounded-2xl p-3">
            {newsPanel}
          </aside>
        </div>

        {/* Mobile: map visible on top, frosted bottom sheet with tabs */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          <div className="flex-1" />
          <div className="glass pointer-events-auto flex max-h-[50%] flex-col rounded-2xl p-3">
            <div className="mb-2 flex gap-1 rounded-xl bg-white/5 p-1">
              {(
                [
                  { id: 'sismos', label: 'Sismos', Icon: IconQuake },
                  { id: 'news', label: 'Noticias', Icon: IconNews },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileView(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                    mobileView === tab.id ? 'bg-sky-500/25 text-sky-200' : 'text-slate-400'
                  }`}
                >
                  <tab.Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
              {mobileView === 'sismos' ? sismosPanel : newsPanel}
            </div>
          </div>
        </div>
      </div>

      {/* Top toast (e.g. national-scope news) */}
      <Toast message={toast} onDismiss={() => setToast(null)} />

      {/* Floating news card over the map */}
      {activeNews !== null && (
        <NewsFlyout
          item={activeNews}
          regionName={activeNewsRegionName}
          onClose={() => setActiveNews(null)}
        />
      )}
    </div>
  )
}

export default App
