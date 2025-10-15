import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, MessageSquare, X, Send } from 'lucide-react';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { DialogComponent, AnimationSettingsModel } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { SpeechmaticsSTT } from '@/services/speechmatics-stt';
import { ClaudeConversation } from '@/services/claude-conversation';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function VoiceInterface() {
  // Dölj röst på desktop, visa bara text-knapp
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  const [isListening, setIsListening] = useState(false);
  const [partialText, setPartialText] = useState(''); // Pågående tal (live)
  const [finalText, setFinalText] = useState(''); // Bekräftat tal
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [closeButtonHover, setCloseButtonHover] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();

  const initializeServices = async () => {
    if (!user) return;

    try {
      // TTS borttagen - använder text-dialog istället för att undvika feedback loop

      // Initialize STT (backend hanterar auth och config)
      sttRef.current = new SpeechmaticsSTT();

      // Initialize Claude (backend har API-nyckeln)
      // Hämta kalenderhändelser om användaren är inloggad på Microsoft
      let calendarEvents: any[] = [];
      try {
        const { getCalendarEvents, isMicrosoftLoggedIn } = await import('@/services/microsoft-graph');
        const isLoggedIn = await isMicrosoftLoggedIn();

        if (isLoggedIn) {
          const now = new Date();
          const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 dagar framåt
          calendarEvents = await getCalendarEvents(now, endDate);
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      }

      // Hämta projekt
      let projects: any[] = [];
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);
        if (data) projects = data;
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }

      claudeRef.current = new ClaudeConversation(
        {
          tasks,
          projects,
          calendarEvents,
          recentFiles: [],
          userId: user.id,
        },
        {
          onTaskCreate: createTask,
          onTaskUpdate: updateTask,
          onTaskDelete: deleteTask,
        }
      );

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize voice services:', error);
      setError('Kunde inte initialisera röstfunktioner');
    }
  };

  const handleUserMessage = useCallback(async (message: string) => {
    // Lägg till i log
    const userMessage: ConversationMessage = {
      role: 'user',
      text: message,
      timestamp: new Date(),
    };
    setConversationLog(prev => [...prev, userMessage]);

    // Rensa text och uppdatera status
    setPartialText('');
    setFinalText('');
    setIsListening(false);
    setStatus('AI tänker...');
    sttRef.current?.stopListening();

    if (!claudeRef.current) {
      setError('AI-assistent inte tillgänglig');
      setStatus('');
      return;
    }

    try {
      // Uppdatera Claude context med senaste tasks och kalender
      let calendarEvents: any[] = [];
      try {
        const { getCalendarEvents, isMicrosoftLoggedIn } = await import('@/services/microsoft-graph');
        const isLoggedIn = await isMicrosoftLoggedIn();

        if (isLoggedIn) {
          const now = new Date();
          const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          calendarEvents = await getCalendarEvents(now, endDate);
        }
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
      }

      claudeRef.current.updateContext({ tasks, calendarEvents });

      // Skicka till Claude
      const response = await claudeRef.current.chat(message);

      if (response) {
        // Lägg till i log
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          text: response,
          timestamp: new Date(),
        };
        setConversationLog(prev => [...prev, assistantMessage]);

        // Visa textsvar istället för TTS (undviker feedback loop)
        setStatus('');

        // Expandera automatiskt för att visa svaret
        setIsExpanded(true);
      } else {
        setStatus('');
      }
    } catch (error) {
      console.error('Conversation error:', error);
      setError('Kunde inte få svar från AI-assistenten');
      setStatus('');
    }
  }, [tasks]);

  const handleStartListening = useCallback(async () => {
    if (!sttRef.current) {
      setError('Röstigenkänning inte tillgänglig');
      return;
    }

    try {
      setIsListening(true);
      setPartialText('');
      setFinalText('');
      setError(null);
      setStatus('Ansluter...');

      await sttRef.current.startListening((text, isFinal) => {
        console.log('🎤 Transcript callback:', { text, isFinal });
        setStatus('Lyssnar...');

        if (isFinal) {
          // Final text - lägg till i final och rensa partial
          console.log('✅ Final transcript:', text);
          setFinalText(prev => prev + (prev ? ' ' : '') + text);
          setPartialText('');

          // Skicka hela finalText till Claude när den är klar
          // (väntar tills stopListening anropas)
        } else {
          // Partial text - visa live
          console.log('📝 Partial text:', text);
          setPartialText(text);
        }
      });

      // Timeout: visa varning om ingen text efter 5 sekunder
      setTimeout(() => {
        if (isListening && !finalText && !partialText) {
          setStatus('Inget ljud upptäckt...');
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Kunde inte starta röstigenkänning');
      setStatus('');
      setIsListening(false);
    }
  }, [handleUserMessage, isListening, finalText, partialText]);

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      // Stoppa lyssnande men behåll texten
      setIsListening(false);
      setStatus('Pausad - klicka Skicka eller fortsätt prata');
      sttRef.current?.stopListening(false);
    } else {
      // Starta lyssnande
      handleStartListening();
    }
  }, [isListening, handleStartListening]);

  const handleSendToAI = useCallback(() => {
    // Skicka allt som finns (final + partial)
    const fullText = (finalText + (partialText ? ' ' + partialText : '')).trim();

    if (fullText) {
      console.log('🎯 Skickar text till Claude:', fullText);
      setStatus('Bearbetar...');
      handleUserMessage(fullText);
      setPartialText('');
      setFinalText('');
      setIsListening(false);
      sttRef.current?.stopListening(false);
    }
  }, [finalText, partialText, handleUserMessage]);

  const handleTextSubmit = useCallback(() => {
    if (textInputValue.trim()) {
      handleUserMessage(textInputValue.trim());
      setTextInputValue('');
      setShowTextInput(false);
    }
  }, [textInputValue, handleUserMessage]);

  // Initialize services once when user logs in
  useEffect(() => {
    if (!user) return;

    initializeServices();

    // Proper cleanup function
    return () => {
      // Stop active services
      if (sttRef.current) {
        sttRef.current.stopListening(false);
      }

      // Clear references to allow garbage collection
      sttRef.current = null;
      claudeRef.current = null;
    };
  }, [user]); // Removed tasks from dependency array

  // Update Claude context when tasks change
  useEffect(() => {
    if (claudeRef.current && tasks) {
      claudeRef.current.updateContext({ tasks });
    }
  }, [tasks]);

  // Listen for voice trigger events
  useEffect(() => {
    const handleVoiceTrigger = () => {
      if (!isListening) {
        handleStartListening();
      }
    };

    window.addEventListener('trigger-voice', handleVoiceTrigger);

    return () => {
      window.removeEventListener('trigger-voice', handleVoiceTrigger);
    };
  }, [isListening, handleStartListening]);

  const clearConversation = () => {
    setConversationLog([]);
    claudeRef.current?.clearHistory();
  };

  // Långklick-hantering för att öppna conversation view
  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setIsExpanded(!isExpanded);
    }, 500); // 500ms långklick
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  if (!isInitialized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 50
      }}>
        <div style={{
          background: 'var(--e-surface)',
          borderRadius: '9999px',
          padding: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{
            animation: 'spin 1s linear infinite',
            borderRadius: '9999px',
            height: '32px',
            width: '32px',
            borderBottom: '2px solid var(--primary-600)'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      zIndex: 50
    }}>
      {/* Expanded Conversation View */}
      {isExpanded && (
        <div style={{
          marginBottom: '16px',
          background: 'var(--e-surface)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '384px',
          maxHeight: '384px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            borderBottom: '1px solid var(--e-border)'
          }}>
            <h3 style={{
              fontWeight: 600,
              color: 'var(--e-text)',
              margin: 0
            }}>
              Prio AI-assistent
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
              >
                Rensa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                <X style={{ height: '16px', width: '16px' }} />
              </Button>
            </div>
          </div>

          {/* Conversation Log */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            maxHeight: '256px'
          }}>
            {conversationLog.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: 'var(--e-text-secondary)',
                padding: '32px 0'
              }}>
                <MessageSquare style={{
                  height: '32px',
                  width: '32px',
                  margin: '0 auto 8px',
                  opacity: 0.5
                }} />
                <p style={{ fontSize: '14px', margin: 0 }}>Säg hej för att börja prata med din AI-assistent!</p>
              </div>
            ) : (
              <>
                {conversationLog.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      marginBottom: i < conversationLog.length - 1 ? '12px' : '0'
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '8px 16px',
                        borderRadius: '16px',
                        background: msg.role === 'user' ? 'var(--primary-600)' : 'var(--e-surface)',
                        color: msg.role === 'user' ? '#ffffff' : 'var(--e-text)',
                        border: msg.role === 'assistant' ? '1px solid var(--e-border)' : 'none'
                      }}
                    >
                      <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}>{msg.text}</p>
                      <p style={{
                        fontSize: '12px',
                        opacity: 0.7,
                        margin: 0
                      }}>
                        {msg.timestamp.toLocaleTimeString('sv-SE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Live Transcript */}
          {(finalText || partialText) && (
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--e-border)',
              background: 'var(--e-surface)',
              opacity: 0.9
            }}>
              <p style={{
                fontSize: '12px',
                color: 'var(--e-text-secondary)',
                margin: '0 0 4px 0'
              }}>Du säger:</p>
              <p style={{
                fontSize: '14px',
                color: 'var(--e-text)',
                margin: 0
              }}>
                {finalText && (
                  <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>{finalText}</span>
                )}
                {partialText && (
                  <span style={{
                    fontStyle: 'italic',
                    color: 'var(--warning-600)',
                    opacity: 0.9
                  }}>
                    {finalText ? ' ' : ''}{partialText}
                    <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>▊</span>
                  </span>
                )}
              </p>
              <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', gap: '8px' }}>
                {finalText && (
                  <span style={{ color: 'var(--success-600)' }}>
                    ✓ {finalText.split(' ').length} ord
                  </span>
                )}
                {partialText && (
                  <span style={{ color: 'var(--warning-600)', fontStyle: 'italic' }}>
                    ⏳ {partialText.split(' ').length} temporära
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '8px 16px',
              borderTop: '2px solid #ef4444',
              background: 'rgba(239, 68, 68, 0.1)'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#ef4444',
                margin: 0
              }}>{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Status/Transcript Box (when not expanded) */}
      {!isExpanded && (status || finalText || partialText || error) && (
        <div style={{
          marginBottom: '16px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          padding: '16px',
          width: '320px',
          position: 'relative',
          background: error ? 'rgba(239, 68, 68, 0.1)' : 'var(--e-surface)',
          border: error ? '2px solid #ef4444' : 'none'
        }}>
          {/* Close button */}
          <button
            onClick={() => {
              setPartialText('');
              setFinalText('');
              setStatus('');
              setError(null);
            }}
            onMouseEnter={() => setCloseButtonHover(true)}
            onMouseLeave={() => setCloseButtonHover(false)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              padding: '4px',
              background: closeButtonHover ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            aria-label="Stäng"
          >
            <X style={{
              height: '16px',
              width: '16px',
              color: 'var(--e-text-secondary)'
            }} />
          </button>

          {error ? (
            <>
              <p style={{
                fontSize: '14px',
                color: '#ef4444',
                margin: '0 0 4px 0',
                fontWeight: 600
              }}>Fel:</p>
              <p style={{
                color: '#ef4444',
                paddingRight: '24px',
                margin: 0
              }}>{error}</p>
            </>
          ) : (finalText || partialText) ? (
            <>
              <p style={{
                fontSize: '14px',
                color: 'var(--e-text-secondary)',
                margin: '0 0 4px 0'
              }}>Du säger:</p>
              <p style={{
                color: 'var(--e-text)',
                paddingRight: '24px',
                margin: 0
              }}>
                {finalText && (
                  <span style={{ fontWeight: 600, color: 'var(--success-600)' }}>{finalText}</span>
                )}
                {partialText && (
                  <span style={{ fontStyle: 'italic', color: 'var(--warning-600)' }}>
                    {finalText ? ' ' : ''}{partialText}<span style={{ fontWeight: 'bold' }}>▊</span>
                  </span>
                )}
              </p>
            </>
          ) : status ? (
            <>
              <p style={{
                fontSize: '14px',
                color: 'var(--primary-600)',
                margin: '0 0 4px 0'
              }}>Status:</p>
              <p style={{
                color: 'var(--e-text)',
                paddingRight: '24px',
                margin: 0
              }}>{status}</p>
            </>
          ) : null}
        </div>
      )}

      {/* Buttons Container */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Voice Button - Endast mobil */}
        {!isDesktop && (
        <div style={{ position: 'relative' }}>
        <Button
          variant={isListening ? 'danger' : 'primary'}
          size="lg"
          onClick={handleToggleListening}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          style={{
            borderRadius: '9999px',
            width: '64px',
            height: '64px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}
          title={
            isListening
              ? 'Pausa inspelning'
              : 'Starta röstinspelning (håll inne för chat)'
          }
        >
          {isListening ? (
            <MicOff style={{ height: '32px', width: '32px' }} />
          ) : (
            <Mic style={{ height: '32px', width: '32px' }} />
          )}
        </Button>

        {/* Pulsing Animation */}
        {isListening && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '9999px',
            background: '#ef4444',
            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
            opacity: 0.2,
            pointerEvents: 'none'
          }} />
        )}

        {/* Notification Badge */}
        {conversationLog.length > 0 && !isExpanded && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'var(--primary-600)',
            color: '#ffffff',
            fontSize: '12px',
            borderRadius: '9999px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}>
            {conversationLog.length}
          </div>
        )}
        </div>
        )}

        {/* Send Button - Visas när man pratar */}
        {!isDesktop && isListening && (
          <div style={{ position: 'relative' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSendToAI}
              style={{
                borderRadius: '9999px',
                width: '64px',
                height: '64px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
              title="Skicka till AI"
            >
              <Send style={{ height: '28px', width: '28px' }} />
            </Button>
          </div>
        )}

        {/* Text Input Button */}
        <div style={{ position: 'relative' }}>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowTextInput(true)}
            style={{
              borderRadius: '9999px',
              width: '64px',
              height: '64px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            title="Skriv meddelande till AI"
          >
            <MessageSquare style={{ height: '28px', width: '28px' }} />
          </Button>
        </div>
      </div>

      {/* Text Input Dialog */}
      {showTextInput && (
        <DialogComponent
          width="min(90%, 400px)"
          header="Skriv till AI"
          visible={true}
          close={() => {
            setShowTextInput(false);
            setTextInputValue('');
          }}
          showCloseIcon={true}
          isModal={true}
          target="body"
          buttons={[
            {
              buttonModel: {
                content: 'Skicka',
                isPrimary: true,
                cssClass: 'e-primary'
              },
              click: handleTextSubmit
            },
            {
              buttonModel: {
                content: 'Avbryt',
                cssClass: 'e-flat'
              },
              click: () => {
                setShowTextInput(false);
                setTextInputValue('');
              }
            }
          ]}
          animationSettings={{
            effect: 'Zoom',
            duration: 300,
            delay: 0
          } as AnimationSettingsModel}
        >
          <div
            style={{ padding: '16px' }}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
          >
            <TextBoxComponent
              placeholder="Skriv din fråga till AI... (Cmd+Enter för att skicka)"
              floatLabelType="Auto"
              multiline={true}
              value={textInputValue}
              input={(e) => setTextInputValue(e.value)}
            />
          </div>
        </DialogComponent>
      )}
    </div>
  );
}