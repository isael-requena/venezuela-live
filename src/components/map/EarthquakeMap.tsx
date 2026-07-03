/**
 * Interactive Leaflet map of Venezuela with premium, animated markers.
 *
 * Renders earthquakes as pulsing magnitude-scaled dots and news regions as
 * glowing pins. Selecting an earthquake opens a themed Leaflet popup anchored to
 * its marker (a popover that points at the epicenter — not a modal). It can also
 * fly to a focus target and highlight a region. Purely presentational.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLngTuple } from 'leaflet'
import { IconClock, IconExternal, IconLayers, IconLocate, IconMinus, IconPlus } from '../common/icons'
import { DEFAULT_ZOOM, MAP_MAX_BOUNDS, VENEZUELA_CENTER } from '../../config/constants'
import { VENEZUELA_REGIONS } from '../../config/regions'
import type { Earthquake } from '../../types/domain'
import { formatDateTime, formatRelativeTime, magnitudeColor, magnitudeRadius } from '../../utils/format'

/** A request to animate the map to a location. The `nonce` retriggers the fly
 * animation even when the same coordinates are selected again. */
export interface MapFocus {
  readonly coords: LatLngTuple
  readonly zoom: number
  readonly nonce: number
}

interface EarthquakeMapProps {
  readonly earthquakes: readonly Earthquake[]
  /** Count of news items per region id, used to size/label region pins. */
  readonly newsByRegion: ReadonlyMap<string, number>
  /** Region id to highlight with a pulsing ring, or null. */
  readonly highlightRegionId: string | null
  /** Optional fly-to target. */
  readonly focus: MapFocus | null
  /** Earthquake whose detail popover is open, or null. */
  readonly activeQuake: Earthquake | null
  /** Called when a region pin is clicked. */
  readonly onSelectRegion: (regionId: string) => void
  /** Called when an earthquake marker is clicked. */
  readonly onSelectEarthquake: (quake: Earthquake) => void
  /** Called when the earthquake popover is dismissed. */
  readonly onCloseQuake: () => void
}

/** Build a pulsing div-icon for an earthquake, sized & colored by magnitude. */
function quakeIcon(quake: Earthquake): L.DivIcon {
  const size = Math.round(magnitudeRadius(quake.magnitude) * 2)
  const color = magnitudeColor(quake.magnitude)
  return L.divIcon({
    className: '',
    html: `<div class="quake-marker" style="width:${size}px;height:${size}px;color:${color};background:${color};opacity:.85;border:1.5px solid rgba(255,255,255,.5)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

/** Build a glowing numbered pin for a region with news. */
function regionIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="region-marker" style="width:28px;height:28px;font-size:12px">${count}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

/** A large pulsing ring used to highlight the focused region. */
function highlightIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="quake-marker" style="width:44px;height:44px;color:#38bdf8;background:transparent;border:2px solid #38bdf8"></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

/** Minimal content rendered inside the earthquake popover. */
function QuakePopover({ quake, onClose }: { readonly quake: Earthquake; readonly onClose: () => void }): ReactNode {
  const color = magnitudeColor(quake.magnitude)
  return (
    <div className="relative w-44">
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
      >
        ×
      </button>

      <div className="flex items-center gap-2.5 pr-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black"
          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}88` }}
        >
          {quake.magnitude.toFixed(1)}
        </span>
        <div className="min-w-0">
          <p className="line-clamp-2 text-xs leading-snug font-bold text-white">{quake.place}</p>
          <p className="text-[10px] text-slate-400">
            {formatRelativeTime(quake.time)} · {quake.depthKm.toFixed(0)} km
          </p>
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-300">
        <IconClock className="h-3 w-3 shrink-0 text-sky-300" />
        {formatDateTime(quake.time)}
      </p>

      <a
        href={quake.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-2 py-1.5 text-[11px] font-semibold text-white transition-transform hover:scale-[1.02]"
      >
        Ver en USGS <IconExternal className="h-3 w-3" />
      </a>
    </div>
  )
}

/**
 * Renders the earthquake detail popover as a real Leaflet popup anchored to the
 * epicenter (with a pointing tail). React content is portaled into the popup
 * node so it stays interactive. Controlled: closing is driven by `onClose`.
 */
function QuakePopupLayer({
  quake,
  onClose,
}: {
  readonly quake: Earthquake
  readonly onClose: () => void
}): ReactNode {
  const map = useMap()
  const container = useMemo(() => document.createElement('div'), [])
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    let popup: L.Popup | null = null

    // Guard against malformed coordinates so one bad record never crashes the app.
    const [lat, lng] = quake.coordinates
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      onCloseRef.current()
      return
    }
    const latlng: LatLngTuple = [lat, lng]

    // Clicking the map background (not a marker or the popup) dismisses it.
    const handleMapClick = (): void => onCloseRef.current()
    map.on('click', handleMapClick)

    // Zoom to the epicenter FIRST (fixed zoom) so the popover's auto-pan has room
    // below the floating header. Wrapped: flyTo can throw if the map isn't sized.
    try {
      map.flyTo(latlng, 8, { duration: 0.7 })
    } catch {
      /* map not ready yet — the popover still opens at the current view */
    }

    const open = (): void => {
      if (popup !== null) return
      // On mobile the bottom sheet covers the lower half, so push the popover up
      // into the visible map area; on desktop only clear the floating header.
      const isMobile = window.innerWidth < 1024
      const topPad = isMobile ? 140 : 200
      const bottomPad = isMobile ? Math.round(window.innerHeight * 0.5) + 24 : 56
      try {
        popup = L.popup({
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          autoPan: true,
          autoPanPaddingTopLeft: [24, topPad],
          autoPanPaddingBottomRight: [24, bottomPad],
          minWidth: 150,
          maxWidth: 210,
          offset: [0, -4],
        })
          .setLatLng(latlng)
          .setContent(container)
          .openOn(map)
        // Content is portaled in after the first measure; re-pan once it's sized.
        requestAnimationFrame(() => popup?.update())
      } catch {
        /* ignore — never let an opening glitch break the app */
      }
    }

    const timer = setTimeout(open, 760)
    return () => {
      clearTimeout(timer)
      map.off('click', handleMapClick)
      if (popup !== null) map.closePopup(popup)
    }
  }, [map, container, quake.id, quake.coordinates])

  return createPortal(<QuakePopover quake={quake} onClose={onClose} />, container)
}

/** Imperatively flies the map whenever the focus target changes. */
function MapFocusController({ focus }: { readonly focus: MapFocus | null }): null {
  const map = useMap()
  useEffect(() => {
    if (focus === null) return
    try {
      map.flyTo(focus.coords, focus.zoom, { duration: 1.1 })
    } catch {
      /* ignore transient projection errors */
    }
  }, [focus, map])
  return null
}

/** Enables scroll-wheel zoom once the map is mounted. */
function ScrollControl(): null {
  const map = useMap()
  useEffect(() => {
    map.scrollWheelZoom.enable()
  }, [map])
  return null
}

/** Rough bounding box of Venezuela (incl. islands) for the "locate me" button. */
function isInVenezuela(lat: number, lng: number): boolean {
  return lat >= 0.5 && lat <= 16 && lng >= -74.5 && lng <= -59
}

interface MapControlsProps {
  readonly satellite: boolean
  readonly onToggleSatellite: () => void
}

/** Floating glass map controls: locate, layer toggle, and zoom. */
function MapControls({ satellite, onToggleSatellite }: MapControlsProps): ReactNode {
  const map = useMap()
  const [showLocate, setShowLocate] = useState(false)
  const posRef = useRef<LatLngTuple | null>(null)
  const stop = (event: { stopPropagation: () => void }): void => event.stopPropagation()

  // Ask for the user's location on mount; only show the "locate me" button if
  // they accept AND are inside Venezuela.
  useEffect(() => {
    if (typeof navigator === 'undefined' || navigator.geolocation === undefined) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (isInVenezuela(latitude, longitude)) {
          posRef.current = [latitude, longitude]
          setShowLocate(true)
        }
      },
      () => undefined,
      { maximumAge: 10 * 60 * 1000, timeout: 8000 },
    )
  }, [])

  const locate = (): void => {
    const known = posRef.current
    if (known !== null) {
      try {
        map.flyTo(known, 12, { duration: 1 })
      } catch {
        /* ignore */
      }
      return
    }
    if (navigator.geolocation === undefined) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (isInVenezuela(latitude, longitude)) {
          posRef.current = [latitude, longitude]
          try {
            map.flyTo([latitude, longitude], 12, { duration: 1 })
          } catch {
            /* ignore */
          }
        }
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const btn =
    'glass-strong flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:scale-110'

  return (
    // Outer wrapper centers WITHOUT a transform so the buttons' backdrop-filter
    // (glass) keeps working on Safari/iOS (transformed ancestors disable it).
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(50%+6px)] z-[400] flex justify-center lg:bottom-5">
      <div className="pointer-events-auto flex gap-2" onMouseDown={stop} onDoubleClick={stop}>
        {showLocate && (
          <button type="button" aria-label="Mi ubicación" onClick={locate} className={btn}>
            <IconLocate className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          aria-label={satellite ? 'Mapa normal' : 'Mapa satelital'}
          title={satellite ? 'Mapa normal' : 'Mapa satelital'}
          onClick={onToggleSatellite}
          className={`${btn} ${satellite ? 'text-sky-300' : ''}`}
        >
          <IconLayers className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Acercar" onClick={() => map.zoomIn()} className={btn}>
          <IconPlus className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Alejar" onClick={() => map.zoomOut()} className={btn}>
          <IconMinus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * @param props - {@link EarthquakeMapProps}.
 */
export function EarthquakeMap({
  earthquakes,
  newsByRegion,
  highlightRegionId,
  focus,
  activeQuake,
  onSelectRegion,
  onSelectEarthquake,
  onCloseQuake,
}: EarthquakeMapProps): ReactNode {
  // Memoize icons so markers don't rebuild on every render.
  const quakeMarkers = useMemo(
    () =>
      earthquakes.map((quake) => (
        <Marker
          key={quake.id}
          position={quake.coordinates}
          icon={quakeIcon(quake)}
          eventHandlers={{ click: () => onSelectEarthquake(quake) }}
        />
      )),
    [earthquakes, onSelectEarthquake],
  )

  const highlightRegion =
    highlightRegionId !== null
      ? (VENEZUELA_REGIONS.find((region) => region.id === highlightRegionId) ?? null)
      : null

  const [satellite, setSatellite] = useState(false)

  return (
    <MapContainer
      center={VENEZUELA_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={5}
      maxBounds={MAP_MAX_BOUNDS}
      maxBoundsViscosity={0.5}
      zoomControl={false}
      className="h-full w-full"
    >
      <ScrollControl />
      <MapControls satellite={satellite} onToggleSatellite={() => setSatellite((value) => !value)} />
      <MapFocusController focus={focus} />
      {satellite ? (
        <>
          <TileLayer
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        </>
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
      )}

      {quakeMarkers}

      {VENEZUELA_REGIONS.map((region) => {
        const count = newsByRegion.get(region.id)
        if (count === undefined || count === 0) return null
        return (
          <Marker
            key={region.id}
            position={region.coordinates}
            icon={regionIcon(count)}
            eventHandlers={{ click: () => onSelectRegion(region.id) }}
          />
        )
      })}

      {highlightRegion !== null && (
        <Marker
          key={`highlight-${highlightRegion.id}`}
          position={highlightRegion.coordinates}
          icon={highlightIcon()}
          interactive={false}
        />
      )}

      {activeQuake !== null && (
        <QuakePopupLayer key={activeQuake.id} quake={activeQuake} onClose={onCloseQuake} />
      )}
    </MapContainer>
  )
}
