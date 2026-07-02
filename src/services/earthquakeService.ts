/**
 * Earthquake service backed by the USGS FDSN event API (GeoJSON, public, CORS
 * enabled). Results are filtered to the Venezuela bounding box and mapped into
 * the {@link Earthquake} domain model.
 *
 * @see https://earthquake.usgs.gov/fdsnws/event/1/
 */

import { z } from 'zod'
import { VENEZUELA_BBOX } from '../config/constants'
import type { Earthquake } from '../types/domain'
import { fetchJson } from './httpClient'

const USGS_ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query'

/** Schema for the subset of the USGS GeoJSON FeatureCollection we consume. */
const usgsFeatureSchema = z.object({
  id: z.string(),
  properties: z.object({
    mag: z.number().nullable(),
    place: z.string().nullable(),
    time: z.number(),
    url: z.string(),
  }),
  geometry: z
    .object({
      // GeoJSON order: [longitude, latitude, depth].
      coordinates: z.tuple([z.number(), z.number(), z.number()]),
    })
    .nullable(),
})

const usgsResponseSchema = z.object({
  features: z.array(usgsFeatureSchema),
})

/**
 * Build the USGS query URL constrained to Venezuela and the last 30 days.
 *
 * @param minMagnitude - Minimum magnitude to include.
 * @returns A fully-formed request URL.
 */
function buildUrl(minMagnitude: number): string {
  const params = new URLSearchParams({
    format: 'geojson',
    minlatitude: String(VENEZUELA_BBOX.minLatitude),
    maxlatitude: String(VENEZUELA_BBOX.maxLatitude),
    minlongitude: String(VENEZUELA_BBOX.minLongitude),
    maxlongitude: String(VENEZUELA_BBOX.maxLongitude),
    minmagnitude: String(minMagnitude),
    orderby: 'time',
    limit: '200',
  })
  return `${USGS_ENDPOINT}?${params.toString()}`
}

/**
 * Fetch recent earthquakes within Venezuela.
 *
 * @param signal - Optional abort signal.
 * @param minMagnitude - Minimum magnitude (defaults to 2.0 to cut noise).
 * @returns Earthquakes sorted from newest to oldest.
 * @throws {HttpError} On network/HTTP failure.
 */
export async function fetchEarthquakes(signal?: AbortSignal, minMagnitude = 2.0): Promise<Earthquake[]> {
  const raw = await fetchJson(buildUrl(minMagnitude), signal)
  const parsed = usgsResponseSchema.parse(raw)

  return parsed.features
    .filter((feature) => feature.geometry !== null && feature.properties.mag !== null)
    .map((feature) => {
      const [longitude, latitude, depth] = feature.geometry!.coordinates
      return {
        id: feature.id,
        magnitude: feature.properties.mag ?? 0,
        place: feature.properties.place ?? 'Ubicación desconocida',
        coordinates: [latitude, longitude],
        depthKm: depth,
        time: feature.properties.time,
        url: feature.properties.url,
      } satisfies Earthquake
    })
    .filter((quake) => Number.isFinite(quake.coordinates[0]) && Number.isFinite(quake.coordinates[1]))
}
