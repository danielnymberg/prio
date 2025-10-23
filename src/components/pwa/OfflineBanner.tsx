// Lucide icons replaced with SyncFusion e-icons
import { usePWA } from '@/hooks/usePWA';

export function OfflineBanner() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--warning-500)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span className="e-icons e-wifi-off" style={{ fontSize: '16px' }}></span>
          <p style={{ fontSize: '14px', fontWeight: '500' }}>
            Ingen internetanslutning - arbetar offline
          </p>
        </div>
      </div>
    </div>
  );
}
