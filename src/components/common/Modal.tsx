/** Accessible, glassmorphic modal dialog rendered above the map. */

import { useEffect, type ReactNode } from 'react'
import { IconClose } from './icons'

interface ModalProps {
  /** Accessible label for the dialog. */
  readonly title: string
  /** Called when the user requests to close (backdrop, Escape, or close button). */
  readonly onClose: () => void
  /** Use a large, near-fullscreen size (e.g. for the embedded reader). */
  readonly wide?: boolean
  /** Dialog body. */
  readonly children: ReactNode
}

/**
 * Renders a centered modal with a blurred backdrop. Closes on Escape and on
 * backdrop click; locks body scroll while open.
 *
 * @param props - {@link ModalProps}.
 */
export function Modal({ title, onClose, wide = false, children }: ModalProps): ReactNode {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`glass-strong animate-scale-in relative flex w-full flex-col overflow-hidden rounded-2xl ${
          wide ? 'h-[92vh] max-w-6xl' : 'max-h-[88vh] max-w-2xl'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-slate-300 transition-colors hover:bg-black/70 hover:text-white"
        >
          <IconClose className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}
