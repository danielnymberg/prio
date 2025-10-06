import { useState, useEffect } from 'react';
import { Calendar, LogOut, LogIn, Info, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  loginToMicrosoft,
  logoutFromMicrosoft,
  isMicrosoftLoggedIn,
} from '@/services/microsoft-graph';
import {
  getNotificationConfig,
  saveNotificationConfig,
  requestNotificationPermission,
  NotificationConfig,
} from '@/services/notifications';
import { toast } from 'react-hot-toast';

export function SettingsView() {
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(getNotificationConfig());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  useEffect(() => {
    checkMicrosoftConnection();
  }, []);

  const checkMicrosoftConnection = async () => {
    const connected = await isMicrosoftLoggedIn();
    setIsMicrosoftConnected(connected);
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
      const success = await loginToMicrosoft();
      if (success) {
        setIsMicrosoftConnected(true);
        toast.success('Microsoft-konto anslutet! 🎉');
      } else {
        toast.error('Kunde inte ansluta Microsoft-konto');
      }
    } catch (error) {
      console.error('Microsoft login error:', error);
      toast.error('Ett fel uppstod vid inloggning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogout = async () => {
    setIsLoading(true);
    try {
      await logoutFromMicrosoft();
      setIsMicrosoftConnected(false);
      toast.success('Microsoft-konto frånkopplat');
    } catch (error) {
      console.error('Microsoft logout error:', error);
      toast.error('Ett fel uppstod vid utloggning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      toast.success('Notifieringar aktiverade! 🔔');
    } else {
      toast.error('Notifieringar nekades');
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    const newConfig = { ...notificationConfig, enabled };
    setNotificationConfig(newConfig);
    saveNotificationConfig(newConfig);
    toast.success(enabled ? 'Notifieringar påslagna' : 'Notifieringar avstängda');
  };

  const handleToggleNotificationType = (type: keyof NotificationConfig['types']) => {
    const newConfig = {
      ...notificationConfig,
      types: {
        ...notificationConfig.types,
        [type]: !notificationConfig.types[type],
      },
    };
    setNotificationConfig(newConfig);
    saveNotificationConfig(newConfig);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
          Inställningar
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Hantera integrationer och preferenser
        </p>
      </div>

      {/* Microsoft Calendar Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Microsoft Calendar
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              Anslut din Microsoft-kalender för smarta deadline-förslag baserat på din tillgängliga tid.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Vad kan AI:n göra med din kalender?</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Räkna ut realistiska deadlines: "Om ett uppdrag tar 32h, när kan jag leverera?"</li>
                    <li>Visa tillgänglig tid: "Hur mycket tid har jag denna vecka?"</li>
                    <li>Boka fokustid: "Boka in 2h för projektarbete imorgon"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isMicrosoftConnected ? (
                <>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-medium">Anslutet</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMicrosoftLogout}
                    disabled={isLoading}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Koppla från
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading || !import.meta.env.VITE_AZURE_CLIENT_ID}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {isLoading ? 'Ansluter...' : 'Anslut Microsoft-konto'}
                </Button>
              )}
            </div>

            {!import.meta.env.VITE_AZURE_CLIENT_ID && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                ⚠️ Azure Client ID saknas i miljövariabler. Kontakta administratör.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>

          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Notifieringar
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              Få påminnelser om deadlines och försenade uppgifter.
            </p>

            {notificationPermission === 'granted' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Aktivera notifieringar</span>
                  <button
                    onClick={() => handleToggleNotifications(!notificationConfig.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationConfig.enabled
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {notificationConfig.enabled && (
                  <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <label className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">24h före deadline</span>
                      <input
                        type="checkbox"
                        checked={notificationConfig.types['24h_before']}
                        onChange={() => handleToggleNotificationType('24h_before')}
                        className="rounded text-blue-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">2h före deadline</span>
                      <input
                        type="checkbox"
                        checked={notificationConfig.types['2h_before']}
                        onChange={() => handleToggleNotificationType('2h_before')}
                        className="rounded text-blue-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Försenad uppgift</span>
                      <input
                        type="checkbox"
                        checked={notificationConfig.types.overdue}
                        onChange={() => handleToggleNotificationType('overdue')}
                        className="rounded text-blue-600"
                      />
                    </label>
                  </div>
                )}

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium">Notifieringar aktiverade</span>
                  </div>
                </div>
              </div>
            ) : notificationPermission === 'denied' ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <BellOff className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                      Notifieringar blockerade
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Du har blockerat notifieringar. Aktivera dem i webbläsarens inställningar.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleRequestNotificationPermission}
              >
                <Bell className="h-4 w-4 mr-2" />
                Aktivera notifieringar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Voice AI Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Röst-assistent
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
          AI-driven röstassistent med Speechmatics (STT) och Azure TTS.
        </p>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Claude AI</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              import.meta.env.VITE_ANTHROPIC_API_KEY
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {import.meta.env.VITE_ANTHROPIC_API_KEY ? '✓ Konfigurerad' : '✗ Saknas'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">Speechmatics (Röst → Text)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              import.meta.env.VITE_SPEECHMATICS_KEY
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {import.meta.env.VITE_SPEECHMATICS_KEY ? '✓ Konfigurerad' : '✗ Saknas'}
            </span>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700 dark:text-gray-300">Azure TTS (Text → Röst)</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              import.meta.env.VITE_AZURE_SPEECH_KEY
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {import.meta.env.VITE_AZURE_SPEECH_KEY ? '✓ Konfigurerad' : '✗ Saknas'}
            </span>
          </div>
        </div>

        {(!import.meta.env.VITE_ANTHROPIC_API_KEY || !import.meta.env.VITE_SPEECHMATICS_KEY) && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            ⚠️ Röstassistenten kräver API-nycklar. Kontakta admin eller lägg till i .env.local
          </p>
        )}
      </div>

      {/* App Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Om Prio
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Version:</strong> 1.0.0 (FAS 2)</p>
          <p><strong>Prioriteringsmodell:</strong> CPM (Consequence Priority Method)</p>
          <p><strong>Funktioner:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Röstassistent med AI (Claude Sonnet 4)</li>
            <li>Microsoft Calendar-integration</li>
            <li>Automatisk deadline-beräkning</li>
            <li>Fokustid-bokning i kalender</li>
            <li>PWA med offline-stöd</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
