"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches rendering errors in client components.
 * Shows a user-friendly message and offers retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);

    // Report to Sentry if available
    if (typeof window !== "undefined" && "Sentry" in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).Sentry?.captureException(error, {
          extra: { componentStack: errorInfo.componentStack },
        });
      } catch {
        // Sentry not available
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-danger/30 bg-danger/5 p-8">
          <h2 className="text-lg font-semibold text-danger">
            Something went wrong
          </h2>
          <p className="text-sm text-muted">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
