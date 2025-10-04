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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Något gick fel
            </h1>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Appen stötte på ett oväntat fel. Försök ladda om appen för att fortsätta.
            </p>

            {/* Visa felinformation i development mode */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReloadApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Ladda om appen
            </button>

            <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-500">
              Detta rensar all cachad data och laddar om appen
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
