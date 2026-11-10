import { Component, type ReactNode } from "react";

/** Keep a failed optional module inside its section, with a usable recovery action. */
export class FeatureBoundary extends Component<
  { children: ReactNode; name: string; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      this.props.fallback ?? (
        <section role="alert" className="my-3 rounded-xl border border-current/25 p-4 text-sm">
          <p>{this.props.name} nu s-a încărcat. Restul paginii este disponibil.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg border border-current/40 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Reîncarcă pagina
          </button>
        </section>
      )
    );
  }
}
