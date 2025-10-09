import { useState, useEffect } from 'react';
import { Calendar, LogOut, LogIn, Info, Bell, BellOff, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiKeySettings } from './ApiKeySettings';
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
import { getWorkingHoursConfig, saveWorkingHoursConfig, WorkingHoursConfig } from '@/lib/workingHours';
import {
  getScheduleConfig,
  saveScheduleConfig,
  EmailScheduleConfig,
  startEmailScheduler,
  stopEmailScheduler,
  requestNotificationPermission as requestEmailNotificationPermission,
} from '@/services/email-scheduler';
import { toast } from 'react-hot-toast';

export function SettingsView() {
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(getNotificationConfig());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [workingHours, setWorkingHours] = useState<WorkingHoursConfig>(getWorkingHoursConfig());
  const [emailSchedule, setEmailSchedule] = useState<EmailScheduleConfig>(getScheduleConfig());

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
      // Force consent to ensure user grants Mail.Read permission
      const success = await loginToMicrosoft(true);
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

  const handleSaveWorkingHours = () => {
    saveWorkingHoursConfig(workingHours);
    toast.success('Arbetstider sparade!');
  };

  const handleToggleEmailSchedule = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = await requestEmailNotificationPermission();
      if (!hasPermission) {
        toast.error('Notifieringar krävs för email-scheduler');
        return;
      }
    }

    const newConfig = { ...emailSchedule, enabled };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);

    if (enabled) {
      startEmailScheduler();
      toast.success('Email-scheduler aktiverad! 📧');
    } else {
      stopEmailScheduler();
      toast.success('Email-scheduler avstängd');
    }
  };

  const handleUpdateEmailTimes = (times: string[]) => {
    const newConfig = { ...emailSchedule, times };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
    toast.success('Schemaläggning uppdaterad');
  };

  const handleUpdateEmailGrouping = (groupBy: EmailScheduleConfig['groupBy']) => {
    const newConfig = { ...emailSchedule, groupBy };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
  };

  const handleToggleNotifyOnly = (notifyOnly: boolean) => {
    const newConfig = { ...emailSchedule, notifyOnly };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
    toast.success(notifyOnly ? 'Visar bara notis' : 'Skapar tasks automatiskt');
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

      {/* Working Hours Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Arbetstider
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Ange dina normala arbetstider så att appen kan beräkna deadlines korrekt baserat på faktisk arbetstid.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Normal arbetsdag: Start
              </label>
              <select
                value={workingHours.normalStart}
                onChange={(e) => setWorkingHours({ ...workingHours, normalStart: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 13 }, (_, i) => i + 6).map(hour => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Normal arbetsdag: Slut
              </label>
              <select
                value={workingHours.normalEnd}
                onChange={(e) => setWorkingHours({ ...workingHours, normalEnd: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {Array.from({ length: 13 }, (_, i) => i + 12).map(hour => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-3">
            <p className="text-sm text-stone-600 dark:text-sand-200">
              💡 <strong>Flexibilitet:</strong> Du kan arbeta mellan {String(workingHours.flexStart).padStart(2, '0')}:00-{String(workingHours.flexEnd).padStart(2, '0')}:00
              {' '}när det behövs, men appen räknar med {String(workingHours.normalStart).padStart(2, '0')}:00-{String(workingHours.normalEnd).padStart(2, '0')}:00 som normal arbetstid.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="includeWeekends"
              checked={workingHours.includeWeekends}
              onChange={(e) => setWorkingHours({ ...workingHours, includeWeekends: e.target.checked })}
              className="w-4 h-4 text-copper-600 rounded"
            />
            <label htmlFor="includeWeekends" className="text-sm text-gray-700 dark:text-gray-300">
              Inkludera helger i arbetstidsberäkning
            </label>
          </div>

          <Button onClick={handleSaveWorkingHours} variant="primary">
            Spara arbetstider
          </Button>
        </div>
      </div>

      {/* Microsoft Calendar Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
            <Calendar className="h-6 w-6 text-copper-600 dark:text-copper-400" />
          </div>

          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Microsoft Calendar
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              Anslut din Microsoft-kalender för smarta deadline-förslag baserat på din tillgängliga tid.
            </p>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-stone-600 dark:text-sand-200">
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

      {/* Email Scheduler */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Automatisk mejl-processorering
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
              Skapa automatiskt Quickies från olästa mejl vid schemalagda tider.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Vad händer vid schemalagd tid?</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Kollar olästa mejl i din Microsoft-inkorg</li>
                    <li>Visar notifikation med antal olästa mejl</li>
                    <li>Valfritt: Skapar tasks automatiskt (annars bara notis)</li>
                  </ul>
                </div>
              </div>
            </div>

            {!isMicrosoftConnected && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Du måste ansluta ditt Microsoft-konto först för att använda email-scheduler.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Aktivera schemaläggning</span>
                <button
                  onClick={() => handleToggleEmailSchedule(!emailSchedule.enabled)}
                  disabled={!isMicrosoftConnected}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    emailSchedule.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } ${!isMicrosoftConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailSchedule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {emailSchedule.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schemalagda tider (vardagar)
                    </label>
                    <div className="space-y-2">
                      {emailSchedule.times.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...emailSchedule.times];
                              newTimes[index] = e.target.value;
                              handleUpdateEmailTimes(newTimes);
                            }}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          {emailSchedule.times.length > 1 && (
                            <button
                              onClick={() => {
                                const newTimes = emailSchedule.times.filter((_, i) => i !== index);
                                handleUpdateEmailTimes(newTimes);
                              }}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {emailSchedule.times.length < 5 && (
                        <button
                          onClick={() => {
                            handleUpdateEmailTimes([...emailSchedule.times, '12:00']);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          + Lägg till tid
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Gruppering
                    </label>
                    <select
                      value={emailSchedule.groupBy}
                      onChange={(e) => handleUpdateEmailGrouping(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="none">En task per mejl</option>
                      <option value="sender">Gruppera per avsändare</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Bara visa notifikation</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Om av: Skapar tasks automatiskt</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotifyOnly(!emailSchedule.notifyOnly)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        emailSchedule.notifyOnly
                          ? 'bg-blue-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          emailSchedule.notifyOnly ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {emailSchedule.enabled && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">
                      Kollar mejl {emailSchedule.times.join(', ')} på vardagar
                    </span>
                  </div>
                </div>
              )}
            </div>
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
                        ? 'bg-copper-600'
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
                        className="rounded text-copper-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">2h före deadline</span>
                      <input
                        type="checkbox"
                        checked={notificationConfig.types['2h_before']}
                        onChange={() => handleToggleNotificationType('2h_before')}
                        className="rounded text-copper-600"
                      />
                    </label>
                    <label className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Försenad uppgift</span>
                      <input
                        type="checkbox"
                        checked={notificationConfig.types.overdue}
                        onChange={() => handleToggleNotificationType('overdue')}
                        className="rounded text-copper-600"
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

      {/* API Key Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Röst-assistent & AI
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Lägg till dina egna API-nycklar för att aktivera AI-funktioner. Dina nycklar sparas endast i din webbläsare.
        </p>
        <ApiKeySettings />
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
