import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-lg border border-red-200 bg-surface-200 p-6 shadow-lg">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-ink">
                    Oops! Something went wrong
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
                  </p>

                  {import.meta.env.DEV && this.state.error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-ink-muted">
                        Error Details (Development Only)
                      </summary>
                      <div className="mt-2 rounded bg-surface-100 p-3 text-xs">
                        <p className="font-semibold text-red-600">
                          {this.state.error.toString()}
                        </p>
                        {this.state.errorInfo && (
                          <pre className="mt-2 overflow-auto text-ink-muted">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="mt-6 flex space-x-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={this.handleReset}
                      className="flex items-center"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.handleGoHome}
                      className="flex items-center"
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Go Home
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for feature sections.
 * Shows an inline recovery card instead of replacing the full page.
 */
interface FeatureProps {
  children: ReactNode;
  name?: string;
}

interface FeatureState {
  hasError: boolean;
}

class FeatureErrorBoundary extends Component<FeatureProps, FeatureState> {
  constructor(props: FeatureProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): FeatureState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[${this.props.name || 'Feature'}] Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <p className="text-sm text-ink-muted mb-3">
            {this.props.name ? `${this.props.name} failed to load.` : 'Something went wrong.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
export { FeatureErrorBoundary };
