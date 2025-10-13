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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--primary-600)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RefreshCw style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: '500' }}>Ny version tillgänglig!</p>
              <p style={{ fontSize: '14px', color: 'var(--sand-100)' }}>
                Uppdatera appen för att få de senaste funktionerna och förbättringarna
                {oldVersion && ` (från v${oldVersion})`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleUpdate}
              style={{ padding: '8px 16px', backgroundColor: 'white', color: 'var(--primary-600)', fontWeight: '500', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sand-100)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              Uppdatera nu
            </button>
            <button
              onClick={handleDismiss}
              style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Stäng"
            >
              <X style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
