import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** what the reader was trying to read, so the message is not just a stack trace */
  label: string
}

interface State {
  error: Error | null
}

/**
 * One section failing must not take the page with it. The map, the graph and the PDF viewer
 * are three third-party runtimes on one scrollport; a WebGL context loss or a worker error in
 * any of them should cost that section and nothing else.
 */
export class SectionBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[nwis] ${this.props.label} failed`, error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <section className="nwis-section-error" role="alert">
        <div>
          <p className="label">{this.props.label} could not be drawn</p>
          <p className="mono">{error.message}</p>
          <button type="button" onClick={this.reset}>
            Try again
          </button>
        </div>
      </section>
    )
  }
}
