/**
 * Exchange-rate service backed by DolarAPI Venezuela (public, CORS enabled).
 * Returns the official (BCV) and parallel rates mapped into {@link DolarRate}.
 *
 * @see https://ve.dolarapi.com/v1/dolares
 */

import { z } from 'zod'
import type { DolarKind, DolarRate } from '../types/domain'
import { fetchJson } from './httpClient'

const DOLAR_ENDPOINT = 'https://ve.dolarapi.com/v1/dolares'

const dolarItemSchema = z.object({
  fuente: z.string(),
  nombre: z.string(),
  promedio: z.number(),
  fechaActualizacion: z.string(),
})

const dolarResponseSchema = z.array(dolarItemSchema)

/** Map a DolarAPI `fuente` to our domain {@link DolarKind}. */
function toKind(fuente: string): DolarKind | null {
  if (fuente === 'oficial') return 'oficial'
  if (fuente === 'paralelo') return 'paralelo'
  return null
}

/**
 * Fetch the official and parallel USD exchange rates.
 *
 * @param signal - Optional abort signal.
 * @returns The available rates (typically `oficial` and `paralelo`).
 * @throws {HttpError} On network/HTTP failure.
 */
export async function fetchDolarRates(signal?: AbortSignal): Promise<DolarRate[]> {
  const raw = await fetchJson(DOLAR_ENDPOINT, signal)
  const parsed = dolarResponseSchema.parse(raw)

  return parsed
    .map((item): DolarRate | null => {
      const kind = toKind(item.fuente)
      if (kind === null) return null
      return {
        kind,
        source: item.nombre,
        price: item.promedio,
        updatedAt: item.fechaActualizacion,
      }
    })
    .filter((rate): rate is DolarRate => rate !== null)
}
