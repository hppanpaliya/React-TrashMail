import { Component } from "react";

// Error boundaries must be class components; there is no hooks equivalent.
// Catches render/lifecycle throws in descendants so a single page crash does
// not white-screen the whole app. Does NOT catch event-handler or async errors.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Render error boundary caught:", error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.handleReset);
    }

    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm opacity-70">The page hit an unexpected error. Try reloading.</p>
        <div className="flex gap-2">
          <button type="button" onClick={this.handleReset} className="rounded-md border px-3 py-1.5 text-sm">
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className="rounded-md border px-3 py-1.5 text-sm">
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
