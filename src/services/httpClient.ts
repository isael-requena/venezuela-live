/**
 * Minimal HTTP client shared by every service.
 *
 * Responsibilities: enforce a request timeout, normalize transport/HTTP errors
 * into a single {@link HttpError} type, and parse JSON. Services layer their
 * own schema validation (Zod) on top of the returned value.
 */

import { REQUEST_TIMEOUT_MS } from '../config/constants'

/** Error thrown for any non-2xx response or transport failure. */
export class HttpError extends Error {
  /** HTTP status code, or 0 for transport/timeout errors. */
  public readonly status: number

  public constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/**
 * Fetch a URL and parse the body as JSON.
 *
 * @param url - Absolute URL to request.
 * @param signal - Optional caller-provided abort signal, merged with the timeout.
 * @returns The parsed JSON body as `unknown` (validate it before use).
 * @throws {HttpError} On timeout, network failure, or non-2xx status.
 */
export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new HttpError(`Request failed with status ${response.status}`, response.status)
    }

    return (await response.json()) as unknown
  } catch (error) {
    if (error instanceof HttpError) throw error
    const reason = error instanceof Error ? error.message : 'Unknown network error'
    throw new HttpError(reason, 0)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetch a URL and return the body as plain text.
 *
 * @param url - Absolute URL to request.
 * @param signal - Optional caller-provided abort signal, merged with the timeout.
 * @returns The response body as a string.
 * @throws {HttpError} On timeout, network failure, or non-2xx status.
 */
export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new HttpError(`Request failed with status ${response.status}`, response.status)
    }
    return await response.text()
  } catch (error) {
    if (error instanceof HttpError) throw error
    const reason = error instanceof Error ? error.message : 'Unknown network error'
    throw new HttpError(reason, 0)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Convert any thrown value into a user-facing, Spanish-language message.
 *
 * @param error - The caught value.
 * @returns A concise message safe to display in the UI.
 */
export function toUserMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 0) return 'No se pudo conectar. Revisa tu conexión a internet.'
    return `Error del servidor (${error.status}). Intentando de nuevo más tarde.`
  }
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
