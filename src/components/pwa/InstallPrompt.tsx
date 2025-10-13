import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWA, useIOSInstallPrompt } from '@/hooks/usePWA';
import { SyncButton as Button } from '@/components/ui/SyncButton';

export function InstallPrompt() {
  const { isInstallable, platform, install } = usePWA();
  const { shouldShowPrompt: shouldShowIOSPrompt } = useIOSInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('prio_install_prompt_dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('prio_install_prompt_dismissed', 'true');
  };

  const handleInstall = async () => {
    await install();
    handleDismiss();
  };

  // Don't show if dismissed or not installable
  if (isDismissed) return null;

  // Android/Desktop install prompt
  if (isInstallable && (platform === 'android' || platform === 'desktop')) {
    return (
      <div style={{ position: 'fixed', bottom: '80px', left: '16px', right: '16px', width: 'auto', maxWidth: '384px', backgroundColor: 'var(--e-surface)', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '16px', zIndex: 40, border: '1px solid var(--e-border)', marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flexShrink: 0, width: '40px', height: '40px', backgroundColor: 'var(--e-surface)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download style={{ width: '20px', height: '20px', color: 'var(--copper-600)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
              Installera Prio
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--e-text)', marginBottom: '12px' }}>
              Installera appen för snabbare åtkomst och offline-stöd
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleInstall} size="sm" variant="primary">
                Installera
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                <X style={{ width: '16px', height: '16px' }} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // iOS install instructions
  if (shouldShowIOSPrompt) {
    return (
      <div style={{ position: 'fixed', bottom: '80px', left: '16px', right: '16px', width: 'auto', maxWidth: '384px', backgroundColor: 'var(--e-surface)', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', padding: '16px', zIndex: 40, border: '1px solid var(--e-border)', marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flexShrink: 0, width: '40px', height: '40px', backgroundColor: 'var(--e-surface)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download style={{ width: '20px', height: '20px', color: 'var(--copper-600)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
              Installera Prio på iOS
            </h3>
            <div style={{ fontSize: '14px', color: 'var(--e-text)', marginBottom: '12px' }}>
              <p style={{ marginBottom: '8px' }}>För att installera:</p>
              <ol style={{ listStyle: 'decimal', listStylePosition: 'inside', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>
                  Tryck på <Share style={{ width: '16px', height: '16px', display: 'inline' }} /> (dela-knappen)
                </li>
                <li>Välj "Lägg till på hemskärmen"</li>
                <li>Tryck på "Lägg till"</li>
              </ol>
            </div>
            <Button onClick={handleDismiss} size="sm" variant="ghost" style={{ width: '100%' }}>
              Stäng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
