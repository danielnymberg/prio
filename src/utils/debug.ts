// Debug utilities för cache och performance monitoring

interface CacheInfo {
  name: string;
  size: number;
  keys: string[];
}

interface NetworkInfo {
  effectiveType: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface DebugInfo {
  version: string;
  platform: string;
  online: boolean;
  caches: CacheInfo[];
  network: NetworkInfo | null;
  serviceWorker: {
    registered: boolean;
    state: string | null;
    updateAvailable: boolean;
  };
  storage: {
    quota: number;
    usage: number;
    percentUsed: number;
  } | null;
  performance: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint?: number;
  };
}

export async function getDebugInfo(): Promise<DebugInfo> {
  const version = localStorage.getItem('prio_app_version') || '1.0.0';
  const platform = navigator.userAgent;
  const online = navigator.onLine;

  // Cache info
  const caches = await getCacheInfo();

  // Network info
  const network = getNetworkInfo();

  // Service Worker info
  const serviceWorker = await getServiceWorkerInfo();

  // Storage info
  const storage = await getStorageInfo();

  // Performance info
  const performance = getPerformanceInfo();

  return {
    version,
    platform,
    online,
    caches,
    network,
    serviceWorker,
    storage,
    performance,
  };
}

async function getCacheInfo(): Promise<CacheInfo[]> {
  if (!('caches' in window)) return [];

  try {
    const cacheNames = await caches.keys();
    const cacheInfos = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return {
          name,
          size: keys.length,
          keys: keys.map((req) => req.url),
        };
      })
    );
    return cacheInfos;
  } catch (error) {
    console.error('Error getting cache info:', error);
    return [];
  }
}

function getNetworkInfo(): NetworkInfo | null {
  if (!('connection' in navigator)) return null;

  const conn = (navigator as any).connection;
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  };
}

async function getServiceWorkerInfo() {
  if (!('serviceWorker' in navigator)) {
    return {
      registered: false,
      state: null,
      updateAvailable: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return {
        registered: false,
        state: null,
        updateAvailable: false,
      };
    }

    const sw = registration.active || registration.waiting || registration.installing;
    const updateAvailable = registration.waiting !== null;

    return {
      registered: true,
      state: sw?.state || null,
      updateAvailable,
    };
  } catch (error) {
    console.error('Error getting SW info:', error);
    return {
      registered: false,
      state: null,
      updateAvailable: false,
    };
  }
}

async function getStorageInfo() {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      quota,
      usage,
      percentUsed,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
}

function getPerformanceInfo() {
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paintEntries = performance.getEntriesByType('paint');
  const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');

  return {
    loadTime: perfData?.loadEventEnd - perfData?.fetchStart || 0,
    domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.fetchStart || 0,
    firstPaint: firstPaint?.startTime,
  };
}

// Clear all app data (useful for debugging)
export async function clearAllAppData(): Promise<void> {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('All caches cleared');
    }

    // Clear localStorage (except auth)
    const authData = localStorage.getItem('supabase.auth.token');
    localStorage.clear();
    if (authData) {
      localStorage.setItem('supabase.auth.token', authData);
    }
    console.log('LocalStorage cleared');

    // Clear sessionStorage
    sessionStorage.clear();
    console.log('SessionStorage cleared');

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      console.log('Service workers unregistered');
    }

    console.log('All app data cleared successfully');
  } catch (error) {
    console.error('Error clearing app data:', error);
    throw error;
  }
}

// Log debug info to console (formatted)
export async function logDebugInfo(): Promise<void> {
  const info = await getDebugInfo();

  console.group('🔍 Prio Debug Info');
  console.log('Version:', info.version);
  console.log('Platform:', info.platform);
  console.log('Online:', info.online);

  console.group('📦 Caches');
  info.caches.forEach((cache) => {
    console.log(`${cache.name}: ${cache.size} items`);
  });
  console.groupEnd();

  if (info.network) {
    console.group('🌐 Network');
    console.log('Type:', info.network.effectiveType);
    console.log('Downlink:', info.network.downlink, 'Mbps');
    console.log('RTT:', info.network.rtt, 'ms');
    console.log('Save Data:', info.network.saveData);
    console.groupEnd();
  }

  console.group('⚙️ Service Worker');
  console.log('Registered:', info.serviceWorker.registered);
  console.log('State:', info.serviceWorker.state);
  console.log('Update Available:', info.serviceWorker.updateAvailable);
  console.groupEnd();

  if (info.storage) {
    console.group('💾 Storage');
    console.log('Used:', (info.storage.usage / 1024 / 1024).toFixed(2), 'MB');
    console.log('Quota:', (info.storage.quota / 1024 / 1024).toFixed(2), 'MB');
    console.log('Percent Used:', info.storage.percentUsed.toFixed(2), '%');
    console.groupEnd();
  }

  console.group('⚡ Performance');
  console.log('Load Time:', info.performance.loadTime.toFixed(2), 'ms');
  console.log('DOM Content Loaded:', info.performance.domContentLoaded.toFixed(2), 'ms');
  if (info.performance.firstPaint) {
    console.log('First Paint:', info.performance.firstPaint.toFixed(2), 'ms');
  }
  console.groupEnd();

  console.groupEnd();
}

// Expose debug utilities to window for console access
if (import.meta.env.DEV) {
  (window as any).prioDebug = {
    getInfo: getDebugInfo,
    logInfo: logDebugInfo,
    clearAll: clearAllAppData,
  };
  console.log('💡 Debug utilities available: window.prioDebug');
}
