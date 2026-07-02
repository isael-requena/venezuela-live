/** Reusable card container for sidebar data sections. */

import type { ReactNode } from 'react'

interface PanelProps {
  /** Section title. */
  readonly title: string
  /** Optional icon rendered before the title. */
  readonly icon?: ReactNode
  /** Optional element rendered on the right of the header (e.g. a status badge). */
  readonly action?: ReactNode
  /** Panel body. */
  readonly children: ReactNode
}

/**
 * A titled, bordered panel matching the app's dark theme.
 *
 * @param props - {@link PanelProps}.
 */
export function Panel({ title, icon, action, children }: PanelProps): ReactNode {
  return (
    <section className="flex flex-col">
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-100 uppercase">
          {icon}
          {title}
        </h2>
        {action}
      </header>
      <div className="px-1">{children}</div>
    </section>
  )
}
