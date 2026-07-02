# 🇻🇪 Venezuela en Vivo

Aplicación web **100% frontend** (sin backend) que muestra en tiempo real, sobre
un mapa de Venezuela:

- 🌎 **Sismos / temblores** recientes (fuente: USGS), escalados por magnitud.
- 💵 **Dólar** oficial (BCV) y paralelo (fuente: DolarAPI Venezuela).
- 📰 **Últimas noticias** de medios venezolanos, geolocalizadas por estado y
  filtrables al hacer clic en el mapa.

Toda la información proviene de **APIs públicas con CORS** (no hay scraping ni
servidor propio), por lo que puede alojarse gratis en cualquier hosting estático.

## Stack

React 19 · Vite 8 · TypeScript (`strict`) · Tailwind CSS v4 · Leaflet · Zod.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:5173 (o el puerto que indique Vite)
pnpm build      # type-check + build de producción en dist/
pnpm lint       # oxlint
```

## Arquitectura

Separación estricta por capas; los componentes son presentacionales y la lógica
de datos vive en hooks/servicios:

```
src/
├─ config/      # constantes del dominio, estados, fuentes de noticias
├─ types/       # modelos de dominio (desacoplados de las APIs externas)
├─ services/    # clientes de API + validación Zod (USGS, DolarAPI, RSS)
├─ hooks/       # useLiveData (polling genérico) + un hook por feature
├─ utils/       # formato, parser RSS, inferencia de región, texto
└─ components/  # UI por feature (map, dolar, earthquakes, news, common)
```

## Fuentes de datos

| Dato     | Fuente                                  | Notas                          |
| -------- | --------------------------------------- | ------------------------------ |
| Sismos   | `earthquake.usgs.gov` (FDSN GeoJSON)    | Filtrado al bbox de Venezuela. |
| Dólar    | `ve.dolarapi.com/v1/dolares`            | Oficial + paralelo.            |
| Noticias | RSS de medios VE vía `api.allorigins.win` | Parseado con `DOMParser`.      |

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Vercel detecta Vite automáticamente:
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist`
4. **Deploy.** Quedará publicado en `https://<tu-proyecto>.vercel.app`.

> También funciona igual en Netlify, Cloudflare Pages o GitHub Pages (este
> último requiere fijar `base` en `vite.config.ts`).

## Aviso

Proyecto sin ánimo de lucro, con fines informativos. La inferencia de la región
de cada noticia es heurística (best-effort) y puede no ser exacta. Las tasas y
datos dependen de la disponibilidad de las fuentes públicas.
