import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error || 'Unexpected runtime error');
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 p-6 text-center text-neutral-100 font-sans">
          <div className="max-w-md rounded-2xl border border-rose-500/40 bg-neutral-900 p-6 shadow-2xl">
            <h1 className="text-xl font-black tracking-wide text-rose-400">
              Engine Recovery Required
            </h1>
            <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
              {this.state.errorMessage || 'A rendering or simulation error interrupted the session.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-amber-400 cursor-pointer"
              >
                Reload Game
              </button>
              <button
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
