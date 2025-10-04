import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function OfflineBanner() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5" />
          <p className="text-sm font-medium">
            Ingen internetanslutning - arbetar offline
          </p>
        </div>
      </div>
    </div>
  );
}
