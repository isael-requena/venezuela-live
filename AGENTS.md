# AGENTS.md

> Memoria compartida entre IAs. Mantener breve. Reglas globales del autor → ~/.claude/CLAUDE.md.

## Proyecto

Venezuela en Vivo: web 100% frontend (sin backend) que muestra en tiempo real
sismos, la tasa del dólar (BCV + paralelo) y noticias de medios venezolanos
geolocalizadas sobre un mapa. Objetivo: información pública útil, gratis y abierta.

## Stack

- React 19 + Vite 8 + TypeScript (`strict`) · gestor: **pnpm**.
- **Backend serverless en Vercel** (`api/news.ts` + `api/_lib/*`): agrega noticias
  server-side (sin CORS): Google News RSS **por estado**, RSS de medios y Reddit RSS.
  Parser con `fast-xml-parser`. Dev: middleware en `vite.config.ts` (`devNewsApi`)
  sirve `/api/news` con el mismo agregador (`server.ssrLoadModule`). IG/FB NO se
  pueden (auth-wall/anti-bot, ni server-side). Frontend: `newsService.fetchNews`
  llama `/api/news` y si falla usa el fallback de scraping cliente por proxies.
- Mapa: Leaflet + react-leaflet, tiles CARTO dark, marcadores `divIcon` animados,
  zoom custom (`MapZoom` dentro de `EarthquakeMap`, `zoomControl={false}`).
- Estilos: Tailwind CSS v4. Diseño: **macOS glassmorphism** — el mapa es el fondo
  full-bleed y la UI flota encima en tarjetas `.glass`/`.glass-strong` (en
  `src/index.css`): SIN bordes, solo `rounded-2xl`, translúcidas con `backdrop-blur`.
  Layout 3 columnas en desktop / bottom-sheet con tabs en móvil (en `App.tsx`).
- Validación de respuestas externas: Zod.
- PWA / offline: `vite-plugin-pwa` (workbox) + caché de datos en localStorage.
- Sin backend, sin estado global, sin router.

## Fuentes de datos (públicas, CORS, sin API key)

- Sismos: USGS FDSN GeoJSON (`earthquake.usgs.gov`), filtrado al bbox de Venezuela.
- Dólar: DolarAPI Venezuela (`ve.dolarapi.com/v1/dolares`).
- Clima + calidad del aire: **Open-Meteo** (`api.open-meteo.com` + `air-quality-api.open-meteo.com`),
  batch multi-ciudad (coords separadas por coma → array), sin key. Códigos WMO y AQI
  europeo mapeados en `utils/weather.ts`. Ciudades en `config/cities.ts`.
- Noticias OFICIALES: RSS de medios VE.
- Noticias REDES (scraping, `category:'social'`):
  - Telegram: preview público `t.me/s/<canal>` parseado como HTML. SOLO funcionan
    canales con preview activo (verificados: `elpitazo`, `vpitv`). EfectoCocuyo,
    runrunesweb, lapatilla, elnacionalweb tienen preview DESACTIVADO → no sirven.
  - Reddit: usar el feed **RSS** `/r/<sub>/new/.rss` (el `.json` da 403/HTML vía proxy).
  - YouTube: feed Atom oficial `youtube.com/feeds/videos.xml?channel_id=UC...` (VPItv).
- Todo va por la **cadena de proxies CORS** (`services/corsProxy.ts`: AllOrigins →
  corsproxy.io → codetabs → thingproxy) con **rotación** + **validador de contenido**
  (rechaza respuestas bloqueadas/recortadas y prueba el siguiente proxy) + concurrencia
  limitada (`utils/concurrency.ts`). Parseo con `DOMParser` (`utils/rssParser.ts`).
  NO usar rss2json (422 en su tier gratis). Los bloqueos afectan al proxy, NO a la IP del usuario.

## Reglas del proyecto (no olvidar)

- Arquitectura por capas: `config → services (Zod) → hooks → components`. Los
  componentes son presentacionales; la lógica de datos vive en hooks/services.
- Todo dato externo se valida con Zod y se mapea a un modelo de `types/domain.ts`
  (los componentes nunca dependen del shape de una API de terceros).
- `useLiveData<T>` centraliza polling + abort + estado async. No duplicar fetching.
- La región de una noticia se infiere en cliente (`utils/regionMatcher.ts`) usando
  alias de `config/regions.ts`. Es heurístico (best-effort), no exacto.
- Intervalos de refresco en `config/constants.ts`.
- Preview local en puerto **5175** (el 5173 lo ocupa otro proyecto del workspace).

## Estado actual

- **Última sesión (2026-06-29):** Añadidas 3 features (verificadas en navegador):
  **Clima + alertas de lluvia** y **calidad del aire (AQI)** por ciudad (Open-Meteo,
  panel `WeatherPanel` en columna izq + tab móvil), y **filtro de magnitud** en sismos
  (Todos/≥3/≥4/≥5). Previo: rediseño macOS glassmorphism (mapa de fondo, paneles
  flotantes sin bordes, zoom custom), lector iframe arreglado (YouTube embed + Telegram
  embed, `utils/embed.ts`), scraping ampliado (Telegram x5, Reddit RSS x2, YouTube),
  proxy con rotación + validador + concurrencia. Build + lint limpios (exit 0), 0 errores.
- **Siguiente paso:** commit inicial (mensaje propuesto abajo) + conectar repo a Vercel.
  NO commiteado aún (regla §3: requiere aprobación explícita del usuario).
- **Pendiente / ideas futuras:** Google News RSS NO sirve (proxies 408/503);
  IG/FB requieren backend serverless; notificaciones push (requiere backend);
  más ciudades/canales; tests unitarios de servicios/utils.

## Commit propuesto (pendiente de aprobación)

```
feat: real-time Venezuela dashboard (quakes, dólar, news, weather)

- Map-first macOS glassmorphism UI (floating frosted panels, no borders)
- Earthquakes (USGS) with magnitude filter + detail modal
- Dólar BCV/paralelo ticker (DolarAPI)
- News: official RSS + social scraping (Telegram/Reddit/YouTube) via
  resilient rotating CORS proxy chain with content validation
- In-map news flyout + embeddable reader (YouTube/Telegram embeds)
- Weather, rain alerts & air quality per city (Open-Meteo)
- PWA offline + localStorage cache; responsive (3-col desktop / tabs mobile)
```

## Decisiones clave

- 2026-06-29 Solo frontend para poder hospedar gratis (Vercel) sin servidor.
- 2026-06-29 Cadena de proxies CORS (no solo AllOrigins) para resiliencia; rss2json descartado (422).
- 2026-06-29 Datos vía APIs públicas con CORS en lugar de web scraping (que exigiría backend).
- 2026-06-29 Sismos sin foto real → visual SVG generado (honesto) en vez de imágenes falsas.
- 2026-06-29 `readLink` robusto (ignora links con rel != alternate) para no abrir feeds de comentarios.
