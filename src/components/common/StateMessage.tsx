/** Inline placeholder for loading, empty, and error states inside a panel. */

import type { ReactNode } from 'react'

interface StateMessageProps {
  readonly variant: 'loading' | 'empty' | 'error'
  readonly message: string
}

const VARIANT_CLASS: Record<StateMessageProps['variant'], string> = {
  loading: 'text-slate-400',
  empty: 'text-slate-500',
  error: 'text-red-400',
}

/**
 * Render a small, centered status message used while a list has no content.
 *
 * @param props - {@link StateMessageProps}.
 */
export function StateMessage({ variant, message }: StateMessageProps): ReactNode {
  return <p className={`py-6 text-center text-sm ${VARIANT_CLASS[variant]}`}>{message}</p>
}
