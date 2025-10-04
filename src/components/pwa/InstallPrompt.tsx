import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWA, useIOSInstallPrompt } from '@/hooks/usePWA';
import { Button } from '@/components/ui/Button';

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
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 z-40 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Installera Prio
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Installera appen för snabbare åtkomst och offline-stöd
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" variant="primary">
                Installera
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                <X className="w-4 h-4" />
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
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 z-40 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Installera Prio på iOS
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              <p className="mb-2">För att installera:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Tryck på <Share className="w-4 h-4 inline" /> (dela-knappen)
                </li>
                <li>Välj "Lägg till på hemskärmen"</li>
                <li>Tryck på "Lägg till"</li>
              </ol>
            </div>
            <Button onClick={handleDismiss} size="sm" variant="ghost" className="w-full">
              Stäng
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
