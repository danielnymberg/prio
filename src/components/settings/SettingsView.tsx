import { useState, useEffect } from 'react';
import { Calendar, LogOut, LogIn, Info, Bell, BellOff, Clock, Mail } from 'lucide-react';
import { SyncButton as Button } from '@/components/ui/SyncButton';
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
import { showToast } from '@/services/toast';
import { SwitchComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { CheckBoxComponent } from '@syncfusion/ej2-react-buttons';

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
        showToast.success('Microsoft-konto anslutet! 🎉');
      } else {
        showToast.error('Kunde inte ansluta Microsoft-konto');
      }
    } catch (error) {
      console.error('Microsoft login error:', error);
      showToast.error('Ett fel uppstod vid inloggning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogout = async () => {
    setIsLoading(true);
    try {
      await logoutFromMicrosoft();
      setIsMicrosoftConnected(false);
      showToast.success('Microsoft-konto frånkopplat');
    } catch (error) {
      console.error('Microsoft logout error:', error);
      showToast.error('Ett fel uppstod vid utloggning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      showToast.success('Notifieringar aktiverade! 🔔');
    } else {
      showToast.error('Notifieringar nekades');
    }
  };

  const handleToggleNotifications = (args: any) => {
    const enabled = args.checked;
    const newConfig = { ...notificationConfig, enabled };
    setNotificationConfig(newConfig);
    saveNotificationConfig(newConfig);
    showToast.success(enabled ? 'Notifieringar påslagna' : 'Notifieringar avstängda');
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
    showToast.success('Arbetstider sparade!');
  };

  const handleToggleEmailSchedule = async (args: any) => {
    const enabled = args.checked;
    if (enabled) {
      const hasPermission = await requestEmailNotificationPermission();
      if (!hasPermission) {
        showToast.error('Notifieringar krävs för email-scheduler');
        return;
      }
    }

    const newConfig = { ...emailSchedule, enabled };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);

    if (enabled) {
      startEmailScheduler();
      showToast.success('Email-scheduler aktiverad! 📧');
    } else {
      stopEmailScheduler();
      showToast.success('Email-scheduler avstängd');
    }
  };

  const handleUpdateEmailTimes = (times: string[]) => {
    const newConfig = { ...emailSchedule, times };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
    showToast.success('Schemaläggning uppdaterad');
  };

  const handleUpdateEmailGrouping = (args: any) => {
    const groupBy = args.value as EmailScheduleConfig['groupBy'];
    const newConfig = { ...emailSchedule, groupBy };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
  };

  const handleToggleNotifyOnly = (args: any) => {
    const notifyOnly = args.checked;
    const newConfig = { ...emailSchedule, notifyOnly };
    setEmailSchedule(newConfig);
    saveScheduleConfig(newConfig);
    showToast.success(notifyOnly ? 'Visar bara notis' : 'Skapar tasks automatiskt');
  };

  // Dropdown data sources
  const startHourData = Array.from({ length: 13 }, (_, i) => ({
    value: i + 6,
    text: `${String(i + 6).padStart(2, '0')}:00`,
  }));

  const endHourData = Array.from({ length: 13 }, (_, i) => ({
    value: i + 12,
    text: `${String(i + 12).padStart(2, '0')}:00`,
  }));

  const groupingData = [
    { value: 'none', text: 'En task per mejl' },
    { value: 'sender', text: 'Gruppera per avsändare' },
  ];

  // Working Hours Content
  const workingHoursContent = () => (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Ange dina normala arbetstider så att appen kan beräkna deadlines korrekt baserat på faktisk arbetstid.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Normal arbetsdag: Start
          </label>
          <DropDownListComponent
            dataSource={startHourData}
            fields={{ text: 'text', value: 'value' }}
            value={workingHours.normalStart}
            change={(e: any) => setWorkingHours({ ...workingHours, normalStart: e.value })}
            cssClass="e-outline"
            popupHeight="200px"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Normal arbetsdag: Slut
          </label>
          <DropDownListComponent
            dataSource={endHourData}
            fields={{ text: 'text', value: 'value' }}
            value={workingHours.normalEnd}
            change={(e: any) => setWorkingHours({ ...workingHours, normalEnd: e.value })}
            cssClass="e-outline"
            popupHeight="200px"
          />
        </div>
      </div>

      <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-3">
        <p className="text-sm text-stone-600 dark:text-sand-200">
          💡 <strong>Flexibilitet:</strong> Du kan arbeta mellan {String(workingHours.flexStart).padStart(2, '0')}:00-{String(workingHours.flexEnd).padStart(2, '0')}:00
          {' '}när det behövs, men appen räknar med {String(workingHours.normalStart).padStart(2, '0')}:00-{String(workingHours.normalEnd).padStart(2, '0')}:00 som normal arbetstid.
        </p>
      </div>

      <CheckBoxComponent
        label="Inkludera helger i arbetstidsberäkning"
        checked={workingHours.includeWeekends}
        change={(e: any) => setWorkingHours({ ...workingHours, includeWeekends: e.checked })}
        cssClass="e-custom-checkbox"
      />

      <Button onClick={handleSaveWorkingHours} variant="primary">
        Spara arbetstider
      </Button>
    </div>
  );

  // Microsoft Calendar Content
  const microsoftCalendarContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
          <Calendar className="h-6 w-6 text-copper-600 dark:text-copper-400" />
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
  );

  // Email Scheduler Content
  const emailSchedulerContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
              <SwitchComponent
                checked={emailSchedule.enabled}
                change={handleToggleEmailSchedule}
                disabled={!isMicrosoftConnected}
                onLabel="På"
                offLabel="Av"
              />
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
                  <DropDownListComponent
                    dataSource={groupingData}
                    fields={{ text: 'text', value: 'value' }}
                    value={emailSchedule.groupBy}
                    change={handleUpdateEmailGrouping}
                    cssClass="e-outline"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Bara visa notifikation</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Om av: Skapar tasks automatiskt</p>
                  </div>
                  <SwitchComponent
                    checked={emailSchedule.notifyOnly}
                    change={handleToggleNotifyOnly}
                    onLabel="Ja"
                    offLabel="Nej"
                  />
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
  );

  // Notifications Content
  const notificationsContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Bell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Få påminnelser om deadlines och försenade uppgifter.
          </p>

          {notificationPermission === 'granted' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Aktivera notifieringar</span>
                <SwitchComponent
                  checked={notificationConfig.enabled}
                  change={handleToggleNotifications}
                  onLabel="På"
                  offLabel="Av"
                />
              </div>

              {notificationConfig.enabled && (
                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <CheckBoxComponent
                    label="24h före deadline"
                    checked={notificationConfig.types['24h_before']}
                    change={() => handleToggleNotificationType('24h_before')}
                    cssClass="e-custom-checkbox mb-2"
                  />
                  <CheckBoxComponent
                    label="2h före deadline"
                    checked={notificationConfig.types['2h_before']}
                    change={() => handleToggleNotificationType('2h_before')}
                    cssClass="e-custom-checkbox mb-2"
                  />
                  <CheckBoxComponent
                    label="Försenad uppgift"
                    checked={notificationConfig.types.overdue}
                    change={() => handleToggleNotificationType('overdue')}
                    cssClass="e-custom-checkbox"
                  />
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
  );

  // App Information Content
  const appInfoContent = () => (
    <div className="p-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
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
  );

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

      <div className="space-y-4">
        {/* Arbetstider */}
        <details open className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <Clock className="h-5 w-5" />
            <span className="font-semibold">Arbetstider</span>
          </summary>
          {workingHoursContent()}
        </details>

        {/* Microsoft Calendar */}
        <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <Calendar className="h-5 w-5" />
            <span className="font-semibold">Microsoft Calendar</span>
          </summary>
          {microsoftCalendarContent()}
        </details>

        {/* Email Scheduler */}
        <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <Mail className="h-5 w-5" />
            <span className="font-semibold">Automatisk mejl-processorering</span>
          </summary>
          {emailSchedulerContent()}
        </details>

        {/* Notifications */}
        <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <Bell className="h-5 w-5" />
            <span className="font-semibold">Notifieringar</span>
          </summary>
          {notificationsContent()}
        </details>

        {/* App Info */}
        <details className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <summary className="flex items-center gap-2 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <Info className="h-5 w-5" />
            <span className="font-semibold">Om Prio</span>
          </summary>
          {appInfoContent()}
        </details>
      </div>
    </div>
  );
}
