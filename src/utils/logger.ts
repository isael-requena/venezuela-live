/**
 * Tiny logger that only emits in development. In production builds
 * `import.meta.env.DEV` is statically false, so these calls are dead-code
 * eliminated and nothing is logged to the user's console.
 */

/**
 * Log a non-fatal error (swallowed flows) during development only.
 *
 * @param context - Short label of where it happened.
 * @param error - The caught value.
 */
export function logError(context: string, error: unknown): void {
  if (!import.meta.env.DEV) return
  // Aborted requests are intentional cancellations (e.g. React StrictMode
  // double-mount, component unmount), not real failures — don't log them.
  const message = error instanceof Error ? error.message : String(error)
  if (/abort/i.test(message)) return
  console.error(`[${context}]`, error)
}

/**
 * Log a development-only diagnostic message.
 *
 * @param context - Short label.
 * @param details - Optional extra values.
 */
export function logDebug(context: string, ...details: unknown[]): void {
  if (import.meta.env.DEV) {
    console.debug(`[${context}]`, ...details)
  }
}
