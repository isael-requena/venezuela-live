/**
 * Floating news card anchored over the map. Unlike a full modal it does NOT
 * cover the whole map, so the user can see the highlighted zone the article
 * refers to. A secondary "read here" action opens a full-screen embedded reader.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { Modal } from '../common/Modal'
import { IconClose, IconExternal, IconGlobe, IconNews, IconPin } from '../common/icons'
import type { NewsItem } from '../../types/domain'
import { embedTarget } from '../../utils/embed'
import { formatRelativeTime } from '../../utils/format'
import { hostnameOf, isHttpUrl } from '../../utils/url'

interface NewsFlyoutProps {
  readonly item: NewsItem
  /** Optional human-readable region name for the badge. */
  readonly regionName: string | null
  readonly onClose: () => void
}

/**
 * @param props - {@link NewsFlyoutProps}.
 */
export function NewsFlyout({ item, regionName, onClose }: NewsFlyoutProps): ReactNode {
  const [isReading, setIsReading] = useState(false)
  const [frameError, setFrameError] = useState(false)
  const canOpen = isHttpUrl(item.link)
  const host = hostnameOf(item.link)

  const closeReader = (): void => {
    setIsReading(false)
    setFrameError(false)
  }

  // Close the card with Escape (matches modal behavior).
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isReading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isReading])

  if (isReading && canOpen) {
    const target = embedTarget(item)
    const canEmbed = target.embeddable && !frameError

    // Only sites we KNOW can be framed (YouTube/Telegram embeds) get an iframe.
    // Everything else shows a clean message + "open in a new tab" — never a blank
    // white frame.
    if (!canEmbed) {
      return (
        <Modal title={item.title} onClose={closeReader}>
          <div className="flex flex-col items-center gap-4 p-6 pt-9 text-center">
            {item.imageUrl !== null && (
              <img
                src={item.imageUrl}
                alt=""
                className="max-h-56 w-full rounded-xl object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-sky-300">{item.sourceName}</span> ·{' '}
                {formatRelativeTime(item.publishedAt)} · {host}
              </p>
              <h2 className="mt-1 text-lg leading-snug font-bold text-white">{item.title}</h2>
              {item.summary.length > 0 && (
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.summary}</p>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <IconGlobe className="h-4 w-4 shrink-0 text-sky-300" />
              No se puede abrir aquí la noticia — este medio no permite mostrarse dentro de la app.
            </div>

            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-[1.02]"
            >
              Abrir noticia en pestaña <IconExternal className="h-4 w-4" />
            </a>
          </div>
        </Modal>
      )
    }

    return (
      <Modal title={item.title} onClose={closeReader} wide>
        <div className="flex h-full min-h-0 flex-col">
          {/* pr-14 leaves room for the Modal's floating close (×) button */}
          <div className="flex items-center gap-2 py-2 pr-14 pl-4 text-xs text-slate-400">
            <span className="min-w-0 flex-1 truncate">Reproductor · {host}</span>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-full bg-sky-500/20 px-3 py-1 font-medium text-sky-300 hover:bg-sky-500/30"
            >
              Abrir en pestaña <IconExternal className="h-3 w-3" />
            </a>
          </div>
          <iframe
            src={target.url}
            title={item.title}
            className="min-h-0 w-full flex-1 bg-black"
            allow="encrypted-media; picture-in-picture; fullscreen; autoplay"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setFrameError(true)}
          />
        </div>
      </Modal>
    )
  }

  return (
    <div className="animate-fade-in pointer-events-none absolute top-[172px] left-1/2 z-[600] flex w-full max-w-[19rem] -translate-x-1/2 justify-center px-3 sm:max-w-sm sm:px-0 lg:top-auto lg:bottom-5">
      <article className="glass-strong pointer-events-auto relative w-full overflow-hidden rounded-2xl shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-slate-300 transition-colors hover:bg-black/80 hover:text-white"
        >
          <IconClose className="h-4 w-4" />
        </button>

        <div className="flex gap-2.5 p-2.5 sm:gap-3 sm:p-3">
          {item.imageUrl !== null ? (
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20 sm:rounded-xl"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/5 sm:h-20 sm:w-20 sm:rounded-xl">
              <IconNews className="h-6 w-6 text-slate-400" />
            </span>
          )}

          <div className="min-w-0 flex-1 pr-6">
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 sm:gap-1.5 sm:text-[11px]">
              <span className="font-semibold text-sky-300">{item.sourceName}</span>
              <span>· {formatRelativeTime(item.publishedAt)}</span>
              {regionName !== null && (
                <span className="flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-blue-300">
                  <IconPin className="h-3 w-3" />
                  {regionName}
                </span>
              )}
            </div>
            <h3 className="mt-1 line-clamp-3 text-[13px] leading-snug font-bold text-white sm:line-clamp-4 sm:text-sm">
              {item.title}
            </h3>
          </div>
        </div>

        {item.summary.length > 0 && (
          <p className="hidden px-3 pb-1 text-xs leading-relaxed text-slate-300 sm:line-clamp-2 sm:block">
            {item.summary}
          </p>
        )}

        <div className="flex gap-2 p-2.5 sm:p-3">
          {canOpen ? (
            <>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-[1.02] sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
              >
                Abrir noticia <IconExternal className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIsReading(true)}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/10 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
              >
                Leer aquí
              </button>
            </>
          ) : (
            <p className="text-xs text-amber-400">Esta noticia no tiene un enlace válido.</p>
          )}
        </div>
      </article>
    </div>
  )
}
