import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ExclamationTriangleIcon } from './icons';

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
            <ExclamationTriangleIcon
              className="w-8 h-8 text-danger-fg"
              strokeWidth={2}
              aria-label="Error"
            />
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
