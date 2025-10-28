import { useState, useEffect, useRef, useCallback } from 'react';
// Lucide icons replaced with SyncFusion e-icons
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DialogComponent, AnimationSettingsModel } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
// import { SpeechmaticsSTT } from '@/services/speechmatics-stt'; // COMMENTED OUT - Using AssemblyAI instead
import { AssemblyAISTT } from '@/services/assemblyai-stt';
import { ClaudeConversation } from '@/services/claude-conversation';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

type VoiceState = 'idle' | 'recording' | 'paused' | 'processing' | 'playing_tts';

export function VoiceInterface() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
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

  const sttRef = useRef<AssemblyAISTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();

  const loadConversationHistory = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

      const response = await fetch(`${BACKEND_URL}/api/conversation/load`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) return;

      const { history } = await response.json();

      if (history) {
        setConversationLog(history);
        claudeRef.current?.loadHistory(history);
        console.log('✅ Loaded conversation history from Redis:', history.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, []);

  const saveConversationHistory = useCallback(async (history: ConversationMessage[]) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return;

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

      await fetch(`${BACKEND_URL}/api/conversation/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ history })
      });

      console.log('✅ Saved conversation history to Redis');
    } catch (error) {
      console.error('Failed to save conversation history:', error);
    }
  }, []);

  const initializeServices = async () => {
    if (!user) return;

    try {
      // TTS borttagen - använder text-dialog istället för att undvika feedback loop

      // Initialize STT with AssemblyAI
      sttRef.current = new AssemblyAISTT();

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

  const playAzureTTS = useCallback(async (text: string) => {
    try {
      setVoiceState('playing_tts');

      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const voice = localStorage.getItem('tts_voice') || 'sv-SE-SofieNeural';
      const speed = parseFloat(localStorage.getItem('tts_speed') || '1.0');

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

      const response = await fetch(`${BACKEND_URL}/api/azure-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text,
          voice,
          format: 'audio-16khz-32kbitrate-mono-mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const { audioData } = await response.json();

      const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
      audio.playbackRate = speed;

      audio.onended = () => {
        console.log('✅ TTS klar - återgår till idle');
        setVoiceState('idle');
        // Mic återaktiveras inte automatiskt - användaren klickar för nästa turn
      };

      audio.play();
    } catch (error) {
      console.error('Azure TTS error:', error);
      setVoiceState('idle');
    }
  }, []);

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
    setVoiceState('processing');
    setStatus('AI tänker...');
    sttRef.current?.stopListening();

    if (!claudeRef.current) {
      setError('AI-assistent inte tillgänglig');
      setStatus('');
      setVoiceState('idle');
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

      // Använd streaming för snabbare respons + sentence-by-sentence TTS
      let fullResponse = '';
      let currentSentence = '';

      await claudeRef.current.chatStreaming(message, async (chunk: string) => {
        fullResponse += chunk;
        currentSentence += chunk;

        // Om chunk slutar med . ! ? → spela meningen
        if (/[.!?]$/.test(chunk.trim())) {
          const sentenceToPlay = currentSentence.trim();
          currentSentence = '';

          // Spela meningen (asynkront, blockerar inte nästa chunk)
          playAzureTTS(sentenceToPlay);
        }
      });

      // Spela resterande text (om ingen avslutande punkt)
      if (currentSentence.trim()) {
        await playAzureTTS(currentSentence.trim());
      }

      // Lägg till i log
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        text: fullResponse,
        timestamp: new Date(),
      };
      setConversationLog(prev => [...prev, assistantMessage]);

      setStatus('');

      // Spara conversation history till Redis
      await saveConversationHistory([...conversationLog, userMessage, assistantMessage]);

    } catch (error) {
      console.error('Conversation error:', error);
      setError('Kunde inte få svar från AI-assistenten');
      setStatus('');
      setVoiceState('idle');
    }
  }, [tasks, conversationLog, playAzureTTS]);

  const handleStartListening = useCallback(async () => {
    if (!sttRef.current) {
      setError('Röstigenkänning inte tillgänglig');
      return;
    }

    try {
      setVoiceState('recording');
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
    loadConversationHistory(); // Load persisted history from Redis

    // Proper cleanup function
    return () => {
      // Stop active services
      if (sttRef.current) {
        sttRef.current.stopListening();
      }

      // Clear references to allow garbage collection
      sttRef.current = null;
      claudeRef.current = null;
    };
  }, [user, loadConversationHistory]); // Removed tasks from dependency array

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

  // EndOfUtterance från Speechmatics hanterar auto-send (ingen manual tystnad-detektion behövs)
  useEffect(() => {
    if (!sttRef.current) return;

    // Registrera EndOfUtterance callback för hands-free mode
    sttRef.current.setOnEndOfUtterance(() => {
      console.log('🔴 EndOfUtterance detected - auto sending to Claude');
      setVoiceState('paused');

      // Skicka accumulated transcript till Claude
      const fullText = finalText.trim();
      if (fullText) {
        handleUserMessage(fullText);
      }
    });
  }, [finalText, handleUserMessage]);

  const clearConversation = () => {
    setConversationLog([]);
    claudeRef.current?.clearHistory();
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
    <>
      {/* Expanded Conversation View - Fixed overlay */}
      {isExpanded && (
        <div style={{
          position: 'fixed',
          bottom: '160px',
          right: '24px',
          zIndex: 50
        }}>
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
                <span className="e-icons e-close" style={{ fontSize: '12px' }}></span>
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
                <span className="e-icons e-comment" style={{
                  fontSize: '32px',
                  display: 'block',
                  margin: '0 auto 8px',
                  opacity: 0.5
                }}></span>
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
        </div>
      )}

      {/* Status/Transcript Box (when not expanded) - Fixed overlay */}
      {!isExpanded && (status || finalText || partialText || error) && (
        <div style={{
          position: 'fixed',
          bottom: '160px',
          right: '24px',
          zIndex: 50
        }}>
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
            <span className="e-icons e-close" style={{
              fontSize: '12px',
              color: 'var(--e-text-secondary)'
            }}></span>
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
        </div>
      )}

      {/* FAB-knappar borttagna - ersätts med centrerad UI */}

      {/* Centrerad Voice Control UI */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        zIndex: 49
      }}>
          {/* State 1: IDLE */}
          {voiceState === 'idle' && (
            <ButtonComponent
              iconCss="e-icons e-microphone"
              cssClass="e-primary e-large"
              onClick={handleStartListening}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%'
              } as any}
            >
              Prata
            </ButtonComponent>
          )}

          {/* State 2: RECORDING */}
          {voiceState === 'recording' && (
            <>
              <ButtonComponent
                iconCss="e-icons e-pause"
                cssClass="e-danger e-large"
                onClick={() => {
                  sttRef.current?.stopListening();
                  setVoiceState('idle');
                  setIsListening(false);
                }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  animation: 'pulse 1.5s ease-in-out infinite'
                } as any}
              >
                Pausa
              </ButtonComponent>

              {/* Live transcript */}
              {partialText && (
                <div style={{
                  background: 'var(--e-surface)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  maxWidth: '280px',
                  textAlign: 'center',
                  border: '1px solid var(--e-border)',
                  fontSize: '14px'
                }}>
                  "{partialText}"
                </div>
              )}
            </>
          )}

          {/* State 3: PAUSED (waiting for EndOfUtterance processing) */}
          {voiceState === 'paused' && (
            <ButtonComponent
              iconCss="e-icons e-pause"
              cssClass="e-warning e-large"
              disabled={true}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%'
              } as any}
            >
              Väntar...
            </ButtonComponent>
          )}

          {/* State 4: PROCESSING (Claude thinking) */}
          {voiceState === 'processing' && (
            <ButtonComponent
              iconCss="e-icons e-spinner"
              cssClass="e-large"
              disabled={true}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%'
              } as any}
            >
              AI...
            </ButtonComponent>
          )}

          {/* State 5: PLAYING_TTS */}
          {voiceState === 'playing_tts' && (
            <ButtonComponent
              iconCss="e-icons e-volume"
              cssClass="e-success e-large"
              disabled={true}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite'
              } as any}
            >
              Spelar...
            </ButtonComponent>
          )}

          {/* Text input knapp - alltid synlig under voice control */}
          <ButtonComponent
            iconCss="e-icons e-edit"
            cssClass="e-flat"
            onClick={() => setShowTextInput(true)}
            style={{ fontSize: '12px' } as any}
          >
            Skriv istället
          </ButtonComponent>
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
    </>
  );
}