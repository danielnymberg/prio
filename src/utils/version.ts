// Version tracking för att upptäcka när appen uppdaterats
export const APP_VERSION = '1.0.0'; // Synka med package.json
const VERSION_KEY = 'prio_app_version';

export function checkVersion(): { isNewVersion: boolean; oldVersion: string | null } {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const isNewVersion = storedVersion !== null && storedVersion !== APP_VERSION;

  return {
    isNewVersion,
    oldVersion: storedVersion,
  };
}

export function updateStoredVersion(): void {
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

export async function clearAllCaches(): Promise<void> {
  try {
    // Rensa browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    }

    // Rensa localStorage förutom auth-relaterad data
    const authData = localStorage.getItem('supabase.auth.token');
    const themeData = localStorage.getItem('theme');
    const onboardingData = localStorage.getItem('prio_onboarding_completed');

    localStorage.clear();

    if (authData) localStorage.setItem('supabase.auth.token', authData);
    if (themeData) localStorage.setItem('theme', themeData);
    if (onboardingData) localStorage.setItem('prio_onboarding_completed', onboardingData);

    console.log('LocalStorage cleared (preserved auth/theme/onboarding)');

    // Uppdatera version
    updateStoredVersion();
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}
