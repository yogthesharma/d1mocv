import { Component, type ReactNode } from 'react'
import { ErrorAlert } from '@/components/shared/error-alert'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort boundary: an unexpected render error shows the standard error
 * alert with a reload action instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error as Error }
  }

  render() {
    const { error } = this.state
    if (error) {
      return <ErrorAlert error={error} onRetry={() => window.location.reload()} />
    }
    return this.props.children
  }
}
