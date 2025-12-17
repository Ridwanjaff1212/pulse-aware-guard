import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", fontFamily: "system-ui", color: "#333", background: "#fff", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>Something went wrong</h1>
          <p style={{ marginBottom: "24px", color: "#666" }}>The application encountered an error. Please try refreshing.</p>
          <pre style={{ color: "#d32f2f", background: "#ffebee", padding: "16px", borderRadius: "8px", maxWidth: "800px", overflow: "auto", fontSize: "14px" }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
