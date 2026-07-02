/**
 * App-level error boundary. Prevents a render error in any single component
 * (e.g. a popover) from blanking the whole application; shows a friendly
 * fallback with a reload action instead.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logError } from '../../utils/logger'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('react', error)
    logError('react:info', info.componentStack)
  }

  public override render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="glass-strong max-w-sm rounded-2xl p-6 text-center">
          <h1 className="text-lg font-bold text-white">Algo salió mal</h1>
          <p className="mt-2 text-sm text-slate-300">
            Ocurrió un error inesperado. Recarga la página para volver a Venezuela en Vivo.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
