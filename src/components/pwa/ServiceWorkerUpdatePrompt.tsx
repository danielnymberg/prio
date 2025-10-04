import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function ServiceWorkerUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setShowPrompt(true);
              }
            });
          }
        });

        // Check for existing waiting worker
        if (reg.waiting) {
          setShowPrompt(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-600 text-white rounded-lg shadow-2xl p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Uppdatering tillgänglig</h3>
          <p className="text-sm text-blue-100 mb-3">
            En ny version av appen finns. Klicka på uppdatera för att få de senaste funktionerna.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              Uppdatera nu
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-transparent border border-white/30 text-white font-medium rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              Senare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
