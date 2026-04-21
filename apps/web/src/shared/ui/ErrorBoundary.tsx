import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  override render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback({ error, reset: this.reset });

      return (
        <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-danger-soft flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-danger-fg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              role="img"
              aria-label="Error"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <p className="text-fg-primary font-semibold text-lg">Algo salió mal</p>
          <p className="text-fg-muted text-sm mt-1 max-w-xs">{error.message}</p>
          <button type="button" onClick={this.reset} className="btn-primary mt-6">
            Reintentar
          </button>
        </div>
      );
    }

    return children;
  }
}
