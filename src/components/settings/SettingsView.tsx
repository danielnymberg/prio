import { useState, useEffect } from 'react';
// Lucide icons replaced with SyncFusion e-icons
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
import {
  AccordionComponent,
  AccordionItemDirective,
  AccordionItemsDirective,
} from '@syncfusion/ej2-react-navigations';
import { SwitchComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { CheckBoxComponent, RadioButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextAreaComponent } from '@syncfusion/ej2-react-inputs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function SettingsView() {
  console.log('🔍 DEBUG: SettingsView mounting');

  let isMicrosoftConnected, setIsMicrosoftConnected;
  let isLoading, setIsLoading;
  let notificationConfig, setNotificationConfig;
  let notificationPermission, setNotificationPermission;
  let workingHours, setWorkingHours;
  let emailSchedule, setEmailSchedule;
  let ttsSpeed, setTtsSpeed;
  let ttsVoice, setTtsVoice;
  let aiPreferences, setAiPreferences;

  try {
    console.log('🔍 DEBUG: Initializing state hooks...');
    [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
    [isLoading, setIsLoading] = useState(false);
    [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(getNotificationConfig());
    [notificationPermission, setNotificationPermission] = useState(
      typeof Notification !== 'undefined' ? Notification.permission : 'denied'
    );
    [workingHours, setWorkingHours] = useState<WorkingHoursConfig>(getWorkingHoursConfig());
    [emailSchedule, setEmailSchedule] = useState<EmailScheduleConfig>(getScheduleConfig());
    [ttsSpeed, setTtsSpeed] = useState<string>(localStorage.getItem('tts_speed') || '1.0');
    [ttsVoice, setTtsVoice] = useState<string>(localStorage.getItem('tts_voice') || 'sv-SE-SofieNeural');
    [aiPreferences, setAiPreferences] = useState<string>('');
    console.log('✅ DEBUG: All state hooks initialized successfully');
  } catch (error) {
    console.error('❌ DEBUG: Error initializing state hooks:', error);
    throw error;
  }

  const { user } = useAuth();

  useEffect(() => {
    console.log('🔍 DEBUG: useEffect running - checkMicrosoftConnection');
    checkMicrosoftConnection();
  }, []);

  useEffect(() => {
    // Hämta AI preferences vid mount
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

      // Invalidera cache
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
  const workingHoursContent = () => {
    console.log('🔍 DEBUG: workingHoursContent() called');
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--e-text)',
          opacity: 0.7
        }}>
          Ange dina normala arbetstider så att appen kan beräkna deadlines korrekt baserat på faktisk arbetstid.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '0.5rem'
            }}>
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
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '0.5rem'
            }}>
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

        <div style={{
          backgroundColor: 'var(--primary-100)',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--primary-500)'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--e-text)',
            margin: 0
          }}>
            💡 <strong>Flexibilitet:</strong> Du kan arbeta mellan {String(workingHours.flexStart).padStart(2, '0')}:00-{String(workingHours.flexEnd).padStart(2, '0')}:00
            {' '}när det behövs, men appen räknar med {String(workingHours.normalStart).padStart(2, '0')}:00-{String(workingHours.normalEnd).padStart(2, '0')}:00 som normal arbetstid.
          </p>
        </div>

        <CheckBoxComponent
          label="Inkludera helger i arbetstidsberäkning"
          checked={workingHours.includeWeekends}
          change={(e: any) => setWorkingHours({ ...workingHours, includeWeekends: e.checked })}
        />

        <Button onClick={handleSaveWorkingHours} variant="primary">
          Spara arbetstider
        </Button>
      </div>
    );
  };

  // TTS Voice & Speed Content
  const ttsSpeedContent = () => {
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

    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Voice Selection */}
        <div>
          <p style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--e-text)',
            marginBottom: '0.5rem'
          }}>
            Välj röst
          </p>
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
          />
        </div>

        {/* Speed Selection */}
        <div>
          <p style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--e-text)',
            marginBottom: '0.5rem'
          }}>
            Välj hastighet
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--e-text)',
            opacity: 0.7,
            marginBottom: '0.75rem'
          }}>
            Snabbare = kortare svarstid från AI
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <RadioButtonComponent
              label="Långsam (0.8x) - Tydligast"
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
              label="Snabb (1.3x) - Spara tid"
              name="tts-speed"
              value="1.3"
              checked={ttsSpeed === '1.3'}
              change={() => handleTtsSpeedChange('1.3')}
            />

            <RadioButtonComponent
              label="Mycket snabb (1.5x) - Effektivt"
              name="tts-speed"
              value="1.5"
              checked={ttsSpeed === '1.5'}
              change={() => handleTtsSpeedChange('1.5')}
            />
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--primary-100)',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--primary-500)'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--e-text)',
            margin: 0
          }}>
            💡 <strong>Tips:</strong> Vid bilkörning rekommenderas Normal (1.0x) för bra balans mellan hastighet och tydlighet.
          </p>
        </div>
      </div>
    );
  };

  // Microsoft Calendar Content
  const microsoftCalendarContent = () => {
    console.log('🔍 DEBUG: microsoftCalendarContent() called');
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--e-surface)',
            borderRadius: '8px'
          }}>
            <span className="e-icons e-schedule" style={{
              fontSize: '24px',
              color: 'var(--primary-500)'
            }}></span>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--e-text)',
              opacity: 0.7,
              marginBottom: '1rem'
            }}>
              Anslut din Microsoft-kalender för smarta deadline-förslag baserat på din tillgängliga tid.
            </p>

            <div style={{
              backgroundColor: 'var(--primary-100)',
              border: '1px solid var(--primary-500)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="e-icons e-info" style={{
                  fontSize: '16px',
                  color: 'var(--primary-600)',
                  flexShrink: 0,
                  marginTop: '0.125rem'
                }}></span>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--e-text)'
                }}>
                  <p style={{
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    marginTop: 0
                  }}>
                    Vad kan AI:n göra med din kalender?
                  </p>
                  <ul style={{
                    listStyleType: 'disc',
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    marginLeft: '0.25rem',
                    marginBottom: 0
                  }}>
                    <li>Räkna ut realistiska deadlines: "Om ett uppdrag tar 32h, när kan jag leverera?"</li>
                    <li>Visa tillgänglig tid: "Hur mycket tid har jag denna vecka?"</li>
                    <li>Boka fokustid: "Boka in 2h för projektarbete imorgon"</li>
                  </ul>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              {isMicrosoftConnected ? (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--success-500, #10b981)'
                  }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: 'var(--success-500, #10b981)',
                      borderRadius: '9999px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <span style={{ fontWeight: '500' }}>Anslutet</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMicrosoftLogout}
                    disabled={isLoading}
                  >
                    <span className="e-icons e-logout" style={{
                      fontSize: '16px',
                      marginRight: '0.25rem'
                    }}></span>
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
                  <span className="e-icons e-login" style={{
                    fontSize: '16px',
                    marginRight: '0.5rem'
                  }}></span>
                  {isLoading ? 'Ansluter...' : 'Anslut Microsoft-konto'}
                </Button>
              )}
            </div>

            {!import.meta.env.VITE_AZURE_CLIENT_ID && (
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--warning-500, var(--warning-500))',
                marginTop: '0.75rem'
              }}>
                ⚠️ Azure Client ID saknas i miljövariabler. Kontakta administratör.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Email Scheduler Content
  const emailSchedulerContent = () => {
    console.log('🔍 DEBUG: emailSchedulerContent() called');
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--primary-100)',
            borderRadius: '8px'
          }}>
            <span className="e-icons e-mail" style={{
              fontSize: '24px',
              color: 'var(--primary-600)'
            }}></span>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--e-text)',
              opacity: 0.7,
              marginBottom: '1rem'
            }}>
              Skapa automatiskt Quickies från olästa mejl vid schemalagda tider.
            </p>

            <div style={{
              backgroundColor: 'var(--primary-100)',
              border: '1px solid var(--primary-500)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span className="e-icons e-info" style={{
                  fontSize: '16px',
                  color: 'var(--primary-600)',
                  flexShrink: 0,
                  marginTop: '0.125rem'
                }}></span>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--e-text)'
                }}>
                  <p style={{
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                    marginTop: 0
                  }}>
                    Vad händer vid schemalagd tid?
                  </p>
                  <ul style={{
                    listStyleType: 'disc',
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    marginLeft: '0.25rem',
                    marginBottom: 0
                  }}>
                    <li>Kollar olästa mejl i din Microsoft-inkorg</li>
                    <li>Visar notifikation med antal olästa mejl</li>
                    <li>Valfritt: Skapar tasks automatiskt (annars bara notis)</li>
                  </ul>
                </div>
              </div>
            </div>

            {!isMicrosoftConnected && (
              <div style={{
                backgroundColor: 'var(--warning-100, #fef3c7)',
                border: '1px solid var(--warning-500, var(--warning-500))',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'var(--warning-800, #92400e)',
                  margin: 0
                }}>
                  ⚠️ Du måste ansluta ditt Microsoft-konto först för att använda email-scheduler.
                </p>
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ color: 'var(--e-text)' }}>Aktivera schemaläggning</span>
                <SwitchComponent
                  checked={emailSchedule.enabled}
                  change={handleToggleEmailSchedule}
                  disabled={!isMicrosoftConnected}
                  onLabel="På"
                  offLabel="Av"
                />
              </div>

              {emailSchedule.enabled && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  paddingLeft: '1rem',
                  borderLeft: '2px solid var(--e-border)'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--e-text)',
                      marginBottom: '0.5rem'
                    }}>
                      Schemalagda tider (vardagar)
                    </label>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {emailSchedule.times.map((time, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...emailSchedule.times];
                              newTimes[index] = e.target.value;
                              handleUpdateEmailTimes(newTimes);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              border: '1px solid var(--e-border)',
                              borderRadius: '8px',
                              backgroundColor: 'var(--e-surface)',
                              color: 'var(--e-text)'
                            }}
                          />
                          {emailSchedule.times.length > 1 && (
                            <button
                              onClick={() => {
                                const newTimes = emailSchedule.times.filter((_, i) => i !== index);
                                handleUpdateEmailTimes(newTimes);
                              }}
                              style={{
                                color: 'var(--error-500, #ef4444)',
                                cursor: 'pointer',
                                backgroundColor: 'transparent',
                                border: 'none',
                                fontSize: '1rem'
                              }}
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
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--primary-600)',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                            border: 'none',
                            textAlign: 'left'
                          }}
                        >
                          + Lägg till tid
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: 'var(--e-text)',
                      marginBottom: '0.5rem'
                    }}>
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

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{
                        fontSize: '0.875rem',
                        color: 'var(--e-text)'
                      }}>
                        Bara visa notifikation
                      </span>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text)',
                        opacity: 0.6,
                        margin: 0
                      }}>
                        Om av: Skapar tasks automatiskt
                      </p>
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
                <div style={{
                  backgroundColor: 'var(--success-100, #dcfce7)',
                  border: '1px solid var(--success-500, #10b981)',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--success-700, #047857)'
                  }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: 'var(--success-500, #10b981)',
                      borderRadius: '9999px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }} />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
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
  };

  // Notifications Content
  const aiPreferencesContent = () => {
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--primary-100)',
            borderRadius: '8px'
          }}>
            <span className="e-icons e-comment" style={{
              fontSize: '24px',
              color: 'var(--primary-600)'
            }}></span>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--e-text)',
              opacity: 0.7,
              marginBottom: '1rem'
            }}>
              Berätta om dig själv så att AI-assistenten kan ge bättre svar från start.
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <TextAreaComponent
                placeholder="Exempel: Jag jobbar som restaureringskonsult, reser till Stockholm varje vecka med SAS, brukar jobba 9-17 men flexibelt, föredrar casual kommunikation..."
                value={aiPreferences}
                change={(e: any) => setAiPreferences(e.value)}
                rows={6}
                floatLabelType="Auto"
              />

              <Button
                onClick={handleSaveAiPreferences}
                className="e-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                Spara preferenser
              </Button>

              <div style={{
                backgroundColor: 'var(--info-100, #dbeafe)',
                border: '1px solid var(--info-500, #3b82f6)',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--info-700, #1d4ed8)'
                }}>
                  💡 <strong>Tips:</strong> Inkludera information om dina arbetstider, resvanor, kommunikationsstil, och andra preferenser som kan hjälpa AI att ge bättre svar.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const notificationsContent = () => {
    console.log('🔍 DEBUG: notificationsContent() called');
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem'
        }}>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--primary-100)',
            borderRadius: '8px'
          }}>
            <span className="e-icons e-bell" style={{
              fontSize: '24px',
              color: 'var(--primary-600)'
            }}></span>
          </div>

          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--e-text)',
              opacity: 0.7,
              marginBottom: '1rem'
            }}>
              Få påminnelser om deadlines och försenade uppgifter.
            </p>

            {notificationPermission === 'granted' ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: 'var(--e-text)' }}>Aktivera notifieringar</span>
                  <SwitchComponent
                    checked={notificationConfig.enabled}
                    change={handleToggleNotifications}
                    onLabel="På"
                    offLabel="Av"
                  />
                </div>

                {notificationConfig.enabled && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    paddingLeft: '1rem',
                    borderLeft: '2px solid var(--e-border)'
                  }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <CheckBoxComponent
                        label="24h före deadline"
                        checked={notificationConfig.types['24h_before']}
                        change={() => handleToggleNotificationType('24h_before')}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <CheckBoxComponent
                        label="2h före deadline"
                        checked={notificationConfig.types['2h_before']}
                        change={() => handleToggleNotificationType('2h_before')}
                      />
                    </div>
                    <CheckBoxComponent
                      label="Försenad uppgift"
                      checked={notificationConfig.types.overdue}
                      change={() => handleToggleNotificationType('overdue')}
                    />
                  </div>
                )}

                <div style={{
                  backgroundColor: 'var(--success-100, #dcfce7)',
                  border: '1px solid var(--success-500, #10b981)',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--success-700, #047857)'
                  }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: 'var(--success-500, #10b981)',
                      borderRadius: '9999px'
                    }} />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Notifieringar aktiverade
                    </span>
                  </div>
                </div>
              </div>
            ) : notificationPermission === 'denied' ? (
              <div style={{
                backgroundColor: 'var(--error-100, #fee2e2)',
                border: '1px solid var(--error-500, #ef4444)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="e-icons e-notification-off" style={{
                    fontSize: '16px',
                    color: 'var(--error-500, #ef4444)',
                    flexShrink: 0,
                    marginTop: '0.125rem'
                  }}></span>
                  <div>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--error-800, #991b1b)',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      marginTop: 0
                    }}>
                      Notifieringar blockerade
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--error-700, #b91c1c)',
                      margin: 0
                    }}>
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
                <span className="e-icons e-bell" style={{
                  fontSize: '16px',
                  marginRight: '0.5rem'
                }}></span>
                Aktivera notifieringar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // App Information Content
  const appInfoContent = () => {
    console.log('🔍 DEBUG: appInfoContent() called');
    return (
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        fontSize: '0.875rem',
        color: 'var(--e-text)',
        opacity: 0.7
      }}>
        <p style={{ margin: 0 }}>
          <strong>Version:</strong> 1.0.0 (FAS 2)
        </p>
        <p style={{ margin: 0 }}>
          <strong>Prioriteringsmodell:</strong> CPM (Consequence Priority Method)
        </p>
        <p style={{ margin: 0 }}>
          <strong>Funktioner:</strong>
        </p>
        <ul style={{
          listStyleType: 'disc',
          paddingLeft: '1.25rem',
          marginLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          marginTop: '0.5rem',
          marginBottom: 0
        }}>
          <li>Röstassistent med AI (Claude Sonnet 4)</li>
          <li>Microsoft Calendar-integration</li>
          <li>Automatisk deadline-beräkning</li>
          <li>Fokustid-bokning i kalender</li>
          <li>PWA med offline-stöd</li>
        </ul>
      </div>
    );
  };

  console.log('🔍 DEBUG: Before return statement');
  console.log('🔍 DEBUG: State values:', {
    isMicrosoftConnected,
    isLoading,
    workingHours,
    emailSchedule,
    notificationPermission
  });

  try {
    console.log('🔍 DEBUG: Starting return JSX');

    console.log('🔍 DEBUG: Rendering header section');
    console.log('🔍 DEBUG: About to render AccordionComponent');

    return (
      <div style={{
        maxWidth: '896px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        padding: '0 1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: 'var(--e-text)',
            marginBottom: '0.5rem'
          }}>
            Inställningar
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--e-text)',
            opacity: 0.7,
            margin: 0
          }}>
            Hantera integrationer och preferenser
          </p>
        </div>

        <AccordionComponent expandMode="Multiple">
          <AccordionItemsDirective>
            <AccordionItemDirective
              header="Arbetstider"
              iconCss="e-icons e-clock"
              expanded={true}
              content={workingHoursContent}
            />

            <AccordionItemDirective
              header="Rösthastighet"
              iconCss="e-icons e-microphone"
              content={ttsSpeedContent}
            />

            <AccordionItemDirective
              header="Microsoft Calendar"
              iconCss="e-icons e-schedule"
              content={microsoftCalendarContent}
            />

            <AccordionItemDirective
              header="Automatisk mejl-processorering"
              iconCss="e-icons e-mail"
              content={emailSchedulerContent}
            />

            <AccordionItemDirective
              header="AI-preferenser"
              iconCss="e-icons e-comment"
              content={aiPreferencesContent}
            />

            <AccordionItemDirective
              header="Notifieringar"
              iconCss="e-icons e-bell"
              content={notificationsContent}
            />

            <AccordionItemDirective
              header="Om Prio"
              iconCss="e-icons e-info"
              content={appInfoContent}
            />
          </AccordionItemsDirective>
        </AccordionComponent>
      </div>
    );
  } catch (error) {
    console.error('❌ DEBUG: Error in return JSX:', error);
    return (
      <div style={{
        maxWidth: '896px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '0 1rem'
      }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--error-500, #ef4444)'
        }}>
          Error rendering SettingsView
        </h1>
        <pre style={{
          backgroundColor: '#f3f4f6',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.75rem',
          overflow: 'auto'
        }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
