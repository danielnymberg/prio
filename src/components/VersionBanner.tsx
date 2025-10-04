import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { checkVersion, clearAllCaches } from '../utils/version';

export function VersionBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [oldVersion, setOldVersion] = useState<string | null>(null);

  useEffect(() => {
    const { isNewVersion, oldVersion } = checkVersion();
    if (isNewVersion) {
      setShowBanner(true);
      setOldVersion(oldVersion);
    }
  }, []);

  const handleUpdate = async () => {
    await clearAllCaches();
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Användaren valde att hoppa över - uppdatera version ändå för att inte visa igen
    localStorage.setItem('prio_app_version', import.meta.env.VITE_APP_VERSION || '1.0.0');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Ny version tillgänglig!</p>
              <p className="text-sm text-blue-100">
                Uppdatera appen för att få de senaste funktionerna och förbättringarna
                {oldVersion && ` (från v${oldVersion})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              Uppdatera nu
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              aria-label="Stäng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
