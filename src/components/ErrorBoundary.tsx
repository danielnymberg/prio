import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logga felet
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Spara felinfo i state
    this.setState({
      error,
      errorInfo,
    });

    // Logga till extern service här om du har det (t.ex. Sentry)
    // logErrorToService(error, errorInfo);
  }

  handleReloadApp = async () => {
    try {
      // Rensa alla caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Caches cleared');
      }

      // Avregistrera alla service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        console.log('Service workers unregistered');
      }

      // Ladda om sidan
      window.location.reload();
    } catch (err) {
      console.error('Error clearing cache:', err);
      // Ladda om ändå
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--e-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ maxWidth: '448px', width: '100%', backgroundColor: 'var(--e-surface)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', margin: '0 auto 16px', backgroundColor: '#ef4444', opacity: 0.1, borderRadius: '50%' }}>
              <AlertTriangle style={{ width: '32px', height: '32px', color: '#ef4444' }} />
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: 'var(--e-text)', marginBottom: '8px' }}>
              Något gick fel
            </h1>

            <p style={{ textAlign: 'center', color: 'var(--e-text)', marginBottom: '24px' }}>
              Appen stötte på ett oväntat fel. Försök ladda om appen för att fortsätta.
            </p>

            {/* Visa felinformation i development mode */}
            {import.meta.env.DEV && this.state.error && (
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', fontFamily: 'monospace', color: '#ef4444', marginBottom: '8px' }}>
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre style={{ fontSize: '12px', color: 'var(--e-text)', overflowX: 'auto', maxHeight: '128px' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReloadApp}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', backgroundColor: 'var(--primary-600)', color: 'white', fontWeight: '500', borderRadius: '8px', transition: 'background-color 0.2s', border: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
            >
              <RefreshCw style={{ width: '20px', height: '20px' }} />
              Ladda om appen
            </button>

            <p style={{ marginTop: '16px', fontSize: '12px', textAlign: 'center', color: 'var(--e-text)', opacity: 0.5 }}>
              Detta rensar all cachad data och laddar om appen
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
