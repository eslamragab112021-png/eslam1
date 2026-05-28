// ============================================================
// Error Boundary — Production-grade error catching
// ============================================================

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, send to Sentry / error tracking
    console.error("[ErrorBoundary] Caught error:", error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8">
          <div className="max-w-md w-full">
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-4xl">
                ⚠️
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">Something went wrong</h2>
              <p className="mb-1 text-sm text-red-400">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <p className="mb-6 text-xs text-slate-500">
                Error ID: {this.state.errorId}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorId: null });
                  window.location.reload();
                }}
                className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
