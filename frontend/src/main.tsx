import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { InvestigationProvider } from './context/InvestigationContext'

import React from 'react'

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', backgroundColor: '#990000', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1>React Crashed</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <InvestigationProvider>
        <App />
      </InvestigationProvider>
    </ErrorBoundary>
  </StrictMode>
)
