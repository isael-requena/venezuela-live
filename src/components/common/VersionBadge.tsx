/**
 * Tiny build-version tag pinned to a corner. Tapping it forces a full update:
 * it unregisters the service worker and clears every cache, then reloads — so
 * the user always lands on the freshly deployed version (no stale PWA shell).
 */

import { useState, type ReactNode } from 'react'
import { IconRefresh } from './icons'

/** Build id injected at compile time (Vercel commit sha, or "dev" locally). */
declare const __APP_VERSION__: string

/** Drop the service worker and all caches, then hard-reload. */
async function forceUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    // Ignore: reload anyway — a plain reload still fetches the newest index.
  } finally {
    window.location.reload()
  }
}

/** @returns The corner version chip that also acts as the "update app" button. */
export function VersionBadge(): ReactNode {
  const [updating, setUpdating] = useState(false)

  const onClick = (): void => {
    if (updating) return
    setUpdating(true)
    void forceUpdate()
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Actualizar la app (borra la caché y recarga)"
      aria-label="Actualizar la app"
      className="pointer-events-auto fixed bottom-1 left-2 z-[900] flex items-center gap-1 rounded-full px-1 py-0.5 text-[9px] leading-none font-medium text-slate-500/60 transition-colors hover:text-slate-200"
    >
      <IconRefresh className={`h-2.5 w-2.5 ${updating ? 'animate-spin' : ''}`} />
      <span>v{__APP_VERSION__}</span>
    </button>
  )
}
