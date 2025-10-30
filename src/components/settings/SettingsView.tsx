import { useState, useEffect } from 'react';
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
import { CheckBoxComponent, RadioButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function SettingsView() {
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(getNotificationConfig());
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [workingHours, setWorkingHours] = useState<WorkingHoursConfig>(getWorkingHoursConfig());
  const [emailSchedule, setEmailSchedule] = useState<EmailScheduleConfig>(getScheduleConfig());
  const [ttsSpeed, setTtsSpeed] = useState<string>(localStorage.getItem('tts_speed') || '1.0');
  const [ttsVoice, setTtsVoice] = useState<string>(localStorage.getItem('tts_voice') || 'sv-SE-SofieNeural');
  const [aiPreferences, setAiPreferences] = useState<string>('');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [debugConsoleEnabled, setDebugConsoleEnabled] = useState(() => {
    return localStorage.getItem('prio-debug-console') === 'true';
  });

  const { user } = useAuth();

  useEffect(() => {
    checkMicrosoftConnection();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadAiPreferences();
    }
  }, [user?.id]);

  const loadAiPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('custom_context')
        .eq('user_id', user!.id)
        .single();

      if (data && !error) {
        setAiPreferences(data.custom_context || '');
      }
    } catch (error) {
      console.error('Failed to load AI preferences:', error);
    }
  };

  const handleSaveAiPreferences = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          custom_context: aiPreferences
        });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com'}/api/preferences/invalidate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
      }

      showToast.success('AI-preferenser sparade!');
    } catch (error) {
      console.error('Failed to save AI preferences:', error);
      showToast.error('Kunde inte spara preferenser');
    }
  };

  const checkMicrosoftConnection = async () => {
    const connected = await isMicrosoftLoggedIn();
    setIsMicrosoftConnected(connected);
  };

  const handleMicrosoftLogin = async () => {
    setIsLoading(true);
    try {
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

  const handleTtsSpeedChange = (value: string) => {
    setTtsSpeed(value);
    localStorage.setItem('tts_speed', value);
    showToast.success('Rösthastighet sparad!');
  };

  const handleTtsVoiceChange = (args: any) => {
    const newVoice = args.value;
    setTtsVoice(newVoice);
    localStorage.setItem('tts_voice', newVoice);
    showToast.success('Röst sparad!');
  };

  const handleToggleDebugConsole = (args: any) => {
    const enabled = args.checked;
    setDebugConsoleEnabled(enabled);
    localStorage.setItem('prio-debug-console', enabled ? 'true' : 'false');
    // Trigger storage event för att uppdatera ConsoleViewer
    window.dispatchEvent(new Event('storage'));
    showToast.success(enabled ? 'Debug-konsol aktiverad' : 'Debug-konsol avstängd');
  };

  // Dropdown data
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

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '4px' }}>
          Inställningar
        </h1>
        <p style={{ fontSize: '14px', opacity: 0.6, margin: 0 }}>
          Hantera integrationer och preferenser
        </p>
      </div>

      {/* Settings Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* 1. TTS SPEED - MOST USED */}
        <div className="e-card">
          <div className="e-card-header">
            <div className="e-card-title">
              <span className="e-icons e-microphone" style={{ fontSize: '16px', marginRight: '8px' }}></span>
              Rösthastighet
            </div>
          </div>
          <div className="e-card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <DropDownListComponent
                dataSource={[
                  { text: 'Sofie (Kvinnlig, varm)', value: 'sv-SE-SofieNeural' },
                  { text: 'Mattias (Manlig, professionell)', value: 'sv-SE-MattiasNeural' },
                  { text: 'Hillevi (Kvinnlig, äldre)', value: 'sv-SE-HilleviNeural' }
                ]}
                fields={{ text: 'text', value: 'value' }}
                value={ttsVoice}
                change={handleTtsVoiceChange}
                placeholder="Välj röst"
                floatLabelType="Auto"
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <RadioButtonComponent
                  label="Långsam (0.8x)"
                  name="tts-speed"
                  value="0.8"
                  checked={ttsSpeed === '0.8'}
                  change={() => handleTtsSpeedChange('0.8')}
                />
                <RadioButtonComponent
                  label="Normal (1.0x) - Rekommenderad"
                  name="tts-speed"
                  value="1.0"
                  checked={ttsSpeed === '1.0'}
                  change={() => handleTtsSpeedChange('1.0')}
                />
                <RadioButtonComponent
                  label="Snabb (1.3x)"
                  name="tts-speed"
                  value="1.3"
                  checked={ttsSpeed === '1.3'}
                  change={() => handleTtsSpeedChange('1.3')}
                />
                <RadioButtonComponent
                  label="Mycket snabb (1.5x)"
                  name="tts-speed"
                  value="1.5"
                  checked={ttsSpeed === '1.5'}
                  change={() => handleTtsSpeedChange('1.5')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. MICROSOFT CALENDAR */}
        <div className="e-card">
          <div className="e-card-header">
            <div className="e-card-title">
              <span className="e-icons e-schedule" style={{ fontSize: '16px', marginRight: '8px' }}></span>
              Microsoft Calendar
            </div>
          </div>
          <div className="e-card-content">
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '12px' }}>
              Anslut din kalender för smarta deadline-förslag och fokustid-bokning.
            </p>

            {isMicrosoftConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success-500)' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: 'var(--success-500)',
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }} />
                  <span style={{ fontWeight: '500' }}>Anslutet</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleMicrosoftLogout} disabled={isLoading}>
                  <span className="e-icons e-logout" style={{ fontSize: '14px', marginRight: '4px' }}></span>
                  Koppla från
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleMicrosoftLogin}
                disabled={isLoading || !import.meta.env.VITE_AZURE_CLIENT_ID}
              >
                <span className="e-icons e-login" style={{ fontSize: '16px', marginRight: '8px' }}></span>
                {isLoading ? 'Ansluter...' : 'Anslut Microsoft-konto'}
              </Button>
            )}
          </div>
        </div>

        {/* 3. AI PREFERENCES */}
        <div className="e-card">
          <div className="e-card-header">
            <div className="e-card-title">
              <span className="e-icons e-comment" style={{ fontSize: '16px', marginRight: '8px' }}></span>
              AI-preferenser
            </div>
          </div>
          <div className="e-card-content">
            <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '12px' }}>
              Berätta om dig själv så att AI-assistenten kan ge bättre svar från start.
            </p>

            <TextAreaComponent
              placeholder="Exempel: Jag jobbar som restaureringskonsult, reser till Stockholm varje vecka med SAS, brukar jobba 9-17 men flexibelt..."
              value={aiPreferences}
              change={(e: any) => setAiPreferences(e.value)}
              rows={4}
              floatLabelType="Auto"
            />

            <Button
              onClick={handleSaveAiPreferences}
              className="e-primary"
              style={{ marginTop: '12px' }}
            >
              Spara preferenser
            </Button>
          </div>
        </div>

        {/* 4. ADVANCED (COLLAPSED) */}
        <div className="e-card">
          <div
            className="e-card-header"
            onClick={() => setAdvancedExpanded(!advancedExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <div className="e-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                <span className="e-icons e-settings" style={{ fontSize: '16px', marginRight: '8px' }}></span>
                Avancerat
              </span>
              <span className={`e-icons ${advancedExpanded ? 'e-chevron-up' : 'e-chevron-down'}`} style={{ fontSize: '14px' }}></span>
            </div>
          </div>

          {advancedExpanded && (
            <div className="e-card-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* WORKING HOURS */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    <span className="e-icons e-clock" style={{ fontSize: '14px', marginRight: '6px' }}></span>
                    Arbetstider
                  </h3>
                  <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px' }}>
                    Ange dina normala arbetstider så att appen kan beräkna deadlines korrekt.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                        Start
                      </label>
                      <DropDownListComponent
                        dataSource={startHourData}
                        fields={{ text: 'text', value: 'value' }}
                        value={workingHours.normalStart}
                        change={(e: any) => setWorkingHours({ ...workingHours, normalStart: e.value })}
                        cssClass="e-outline"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>
                        Slut
                      </label>
                      <DropDownListComponent
                        dataSource={endHourData}
                        fields={{ text: 'text', value: 'value' }}
                        value={workingHours.normalEnd}
                        change={(e: any) => setWorkingHours({ ...workingHours, normalEnd: e.value })}
                        cssClass="e-outline"
                      />
                    </div>
                  </div>

                  <CheckBoxComponent
                    label="Inkludera helger i arbetstidsberäkning"
                    checked={workingHours.includeWeekends}
                    change={(e: any) => setWorkingHours({ ...workingHours, includeWeekends: e.checked })}
                  />

                  <Button onClick={handleSaveWorkingHours} variant="primary" size="sm" style={{ marginTop: '12px' }}>
                    Spara arbetstider
                  </Button>
                </div>

                {/* EMAIL SCHEDULER */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--e-border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    <span className="e-icons e-mail" style={{ fontSize: '14px', marginRight: '6px' }}></span>
                    Automatisk mejl-processorering
                  </h3>
                  <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px' }}>
                    Skapa automatiskt Quickies från olästa mejl vid schemalagda tider.
                  </p>

                  {!isMicrosoftConnected && (
                    <div style={{
                      backgroundColor: 'var(--warning-100)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      marginBottom: '12px'
                    }}>
                      ⚠️ Du måste ansluta ditt Microsoft-konto först.
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px' }}>Aktivera schemaläggning</span>
                    <SwitchComponent
                      checked={emailSchedule.enabled}
                      change={handleToggleEmailSchedule}
                      disabled={!isMicrosoftConnected}
                    />
                  </div>

                  {emailSchedule.enabled && (
                    <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--e-border)' }}>
                      <label style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                        Schemalagda tider (vardagar)
                      </label>
                      {emailSchedule.times.map((time, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...emailSchedule.times];
                              newTimes[index] = e.target.value;
                              handleUpdateEmailTimes(newTimes);
                            }}
                            style={{
                              padding: '6px 10px',
                              border: '1px solid var(--e-border)',
                              borderRadius: '4px',
                              fontSize: '13px'
                            }}
                          />
                          {emailSchedule.times.length > 1 && (
                            <button
                              onClick={() => handleUpdateEmailTimes(emailSchedule.times.filter((_, i) => i !== index))}
                              style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'var(--error-500)',
                                cursor: 'pointer',
                                fontSize: '16px'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      {emailSchedule.times.length < 5 && (
                        <button
                          onClick={() => handleUpdateEmailTimes([...emailSchedule.times, '12:00'])}
                          style={{
                            fontSize: '13px',
                            color: 'var(--primary-600)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          + Lägg till tid
                        </button>
                      )}

                      <div style={{ marginTop: '12px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                        <span style={{ fontSize: '13px' }}>Bara visa notifikation</span>
                        <SwitchComponent
                          checked={emailSchedule.notifyOnly}
                          change={handleToggleNotifyOnly}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DEBUG CONSOLE */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--e-border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    <span className="e-icons e-code" style={{ fontSize: '14px', marginRight: '6px' }}></span>
                    Debug-konsol
                  </h3>
                  <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px' }}>
                    Visa live console.log feed längst ner på skärmen för mobilfelsökning.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px' }}>Visa debug-konsol</span>
                    <SwitchComponent
                      checked={debugConsoleEnabled}
                      change={handleToggleDebugConsole}
                    />
                  </div>
                  {debugConsoleEnabled && (
                    <div style={{
                      backgroundColor: '#fef3c7',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginTop: '12px'
                    }}>
                      ⚠️ Debug-konsolen visas längst ner på skärmen. Du kan minimera/maximera, rensa och exportera loggar.
                    </div>
                  )}
                </div>

                {/* NOTIFICATIONS */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid var(--e-border)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    <span className="e-icons e-bell" style={{ fontSize: '14px', marginRight: '6px' }}></span>
                    Notifieringar
                  </h3>
                  <p style={{ fontSize: '13px', opacity: 0.6, marginBottom: '12px' }}>
                    Få påminnelser om deadlines och försenade uppgifter.
                  </p>

                  {notificationPermission === 'granted' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px' }}>Aktivera notifieringar</span>
                        <SwitchComponent
                          checked={notificationConfig.enabled}
                          change={handleToggleNotifications}
                        />
                      </div>

                      {notificationConfig.enabled && (
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--e-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <CheckBoxComponent
                            label="24h före deadline"
                            checked={notificationConfig.types['24h_before']}
                            change={() => handleToggleNotificationType('24h_before')}
                          />
                          <CheckBoxComponent
                            label="2h före deadline"
                            checked={notificationConfig.types['2h_before']}
                            change={() => handleToggleNotificationType('2h_before')}
                          />
                          <CheckBoxComponent
                            label="Försenad uppgift"
                            checked={notificationConfig.types.overdue}
                            change={() => handleToggleNotificationType('overdue')}
                          />
                        </div>
                      )}
                    </>
                  ) : notificationPermission === 'denied' ? (
                    <div style={{
                      backgroundColor: 'var(--error-100)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      ❌ Notifieringar blockerade. Aktivera dem i webbläsarens inställningar.
                    </div>
                  ) : (
                    <Button variant="primary" size="sm" onClick={handleRequestNotificationPermission}>
                      Aktivera notifieringar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
