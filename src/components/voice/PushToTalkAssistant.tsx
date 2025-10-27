/**
 * PushToTalkAssistant - WhatsApp-style röstassistent
 *
 * Push-to-talk conversation flow:
 * 1. Håll in knapp → Start recording
 * 2. Prata → Se live transcript
 * 3. Släpp knapp → Auto-send till Claude
 * 4. Få röst/text-svar
 * 5. Repetera för konversation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechmaticsSTT } from '@/services/speechmatics-stt';
import { ClaudeConversation } from '@/services/claude-conversation';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ChatUIComponent, UserModel } from '@syncfusion/ej2-react-interactive-chat';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

type VoiceState = 'idle' | 'recording' | 'paused' | 'processing' | 'playing_tts';

export function PushToTalkAssistant() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [finalText, setFinalText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [servicesReady, setServicesReady] = useState(false);

  // Context pre-fetching: Hämta under inspelning för snabbare respons
  const contextPromiseRef = useRef<Promise<any> | null>(null);

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const finalTextRef = useRef<string>(''); // Ref för EndOfUtterance callback
  const ttsQueueRef = useRef<HTMLAudioElement[]>([]); // TTS queue för att spela en mening i taget
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Pågående audio
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null); // Auto-stop timeout
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();

  // ChatUI user models (defined AFTER useAuth)
  const assistantUser: UserModel = {
    id: 'prio-ai',
    user: 'Prio AI',
    avatarBgColor: '#0078D4'
  };

  const currentUserModel: UserModel = {
    id: user?.id || 'current-user',
    user: 'Du',
    avatarBgColor: '#107C10'
  };

  /**
   * Redis conversation persistence
   */
  const loadConversationHistory = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';
      const response = await fetch(`${BACKEND_URL}/api/conversation/load`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) return;

      const { history } = await response.json();

      if (history && claudeRef.current) {
        claudeRef.current.loadHistory(history);

        // Återskapa messages för ChatUI
        const restoredMessages: Message[] = history
          .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg: any) => ({
            role: msg.role,
            text: typeof msg.content === 'string' ? msg.content : '',
            timestamp: new Date()
          }));
        setMessages(restoredMessages);

        console.log('✅ Loaded conversation history from Redis:', history.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  }, []);

  const saveConversationHistory = useCallback(async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !claudeRef.current) return;

      const history = claudeRef.current.getConversationHistory();
      if (history.length === 0) return;

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

  /**
   * Play next audio from queue
   */
  const playNextAudio = useCallback(() => {
    if (ttsQueueRef.current.length === 0) {
      console.log('✅ TTS queue tom - återgår till idle');
      setVoiceState('idle');
      currentAudioRef.current = null;
      return;
    }

    const nextAudio = ttsQueueRef.current.shift()!;
    currentAudioRef.current = nextAudio;

    nextAudio.onended = () => {
      console.log('✅ Mening klar, spelar nästa...');
      playNextAudio();
    };

    nextAudio.play();
  }, []);

  /**
   * Azure TTS playback with queue
   */
  const playAzureTTS = useCallback(async (text: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const voice = localStorage.getItem('tts_voice') || 'sv-SE-SofieNeural';
      const speed = parseFloat(localStorage.getItem('tts_speed') || '1.0');

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

      const response = await fetch(`${BACKEND_URL}/api/azure-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ text, voice, format: 'audio-16khz-32kbitrate-mono-mp3' })
      });

      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

      const { audioData } = await response.json();
      const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
      audio.playbackRate = speed;

      // Lägg till i kö
      ttsQueueRef.current.push(audio);

      // Starta playback om ingen pågår
      if (!currentAudioRef.current) {
        setVoiceState('playing_tts');
        playNextAudio();
      }
    } catch (error) {
      console.error('Azure TTS error:', error);
    }
  }, [playNextAudio]);

  /**
   * Initialize services
   */
  useEffect(() => {
    if (!user) return;

    const initServices = async () => {
      try {
        // Initialize STT
        sttRef.current = new SpeechmaticsSTT();

        // Initialize Claude with context
        let calendarEvents: any[] = [];
        let projects: any[] = [];

        try {
          const { getCalendarEvents, isMicrosoftLoggedIn } = await import('@/services/microsoft-graph');
          const isLoggedIn = await isMicrosoftLoggedIn();

          if (isLoggedIn) {
            const now = new Date();
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            calendarEvents = await getCalendarEvents(now, endDate);
          }
        } catch (err) {
          console.error('Failed to fetch calendar:', err);
        }

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id);
          if (data) projects = data;
        } catch (err) {
          console.error('Failed to fetch projects:', err);
        }

        // Load conversation history från Redis
        await loadConversationHistory();

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

        // Registrera EndOfUtterance callback för hands-free mode (EFTER Claude skapats!)
        sttRef.current.setOnEndOfUtterance(async () => {
          console.log('🔴 EndOfUtterance callback - auto sending to Claude');
          setVoiceState('paused');

          // Använd ref för att undvika stale closure
          const textToSend = finalTextRef.current.trim();

          if (textToSend) {
            console.log('📤 Sending to Claude:', textToSend);

            // Lägg till user message i ChatUI
            const userMessage: Message = {
              role: 'user',
              text: textToSend,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, userMessage]);

            setFinalText('');
            finalTextRef.current = '';

            // Send till Claude
            setVoiceState('processing');

            try {
              // Pre-fetched context
              let calEvts: any[] = [];
              if (contextPromiseRef.current) {
                calEvts = await contextPromiseRef.current;
                contextPromiseRef.current = null;
              }

              if (claudeRef.current) {
                claudeRef.current.updateContext({ tasks, calendarEvents: calEvts });

                let fullResponse = '';
                let currentSentence = '';

                // Lägg till temporary assistant message
                const assistantMessage: Message = {
                  role: 'assistant',
                  text: '',
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);

                await claudeRef.current.chatStreaming(textToSend, async (chunk) => {
                  fullResponse += chunk;
                  currentSentence += chunk;

                  // Update assistant message i ChatUI
                  setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant') {
                      // Skapa NYTT objekt för re-render
                      return [
                        ...prev.slice(0, -1),
                        { role: 'assistant', text: fullResponse, timestamp: lastMsg.timestamp }
                      ];
                    }
                    return prev;
                  });

                  // Azure TTS sentence-by-sentence
                  if (/[.!?]\s*$/.test(chunk.trim()) && currentSentence.trim().length > 10) {
                    console.log('🔊 Playing sentence:', currentSentence.trim());
                    playAzureTTS(currentSentence.trim());
                    currentSentence = '';
                  }
                });

                // Final sentence
                if (currentSentence.trim()) {
                  await playAzureTTS(currentSentence.trim());
                }

                // Save to Redis
                await saveConversationHistory();
              }

            } catch (err) {
              console.error('Claude error:', err);
              setError('Kunde inte få svar från AI');
              toast.error('AI-fel: ' + (err instanceof Error ? err.message : 'Okänt fel'));
              setVoiceState('idle');
            }
          } else {
            console.warn('⚠️ EndOfUtterance men ingen text att skicka');
            setVoiceState('idle');
          }
        });

        // Mark services as ready
        setServicesReady(true);

      } catch (err) {
        console.error('Failed to initialize services:', err);
        setError('Kunde inte initialisera röstassistent');
        setServicesReady(false);
      }
    };

    initServices();

    return () => {
      // Disconnect STT session helt (stänger WebSocket)
      sttRef.current?.disconnect();
      sttRef.current = null;
      claudeRef.current = null;
    };
  }, [user?.id]); // user.id ändras ALDRIG, även om user-objekt byts ut vid token refresh

  /**
   * Sync finalText state → ref for callback
   */
  useEffect(() => {
    finalTextRef.current = finalText;
  }, [finalText]);

  /**
   * Update Claude context when tasks change
   */
  useEffect(() => {
    if (claudeRef.current && tasks) {
      claudeRef.current.updateContext({ tasks });
    }
  }, [tasks]);

  /**
   * START recording - hands-free mode
   */
  const handleStartRecording = useCallback(async () => {
    if (!sttRef.current) {
      toast.error('Röstigenkänning inte tillgänglig');
      return;
    }

    try {
      console.log('🎤 Starting hands-free recording...');
      setVoiceState('recording');
      setFinalText('');
      setError(null);

      // OPTIMERING: Pre-fetch context MEDAN användaren pratar
      console.log('📊 Pre-fetching context during recording...');
      contextPromiseRef.current = (async () => {
        try {
          const { getCalendarEvents, isMicrosoftLoggedIn } = await import('@/services/microsoft-graph');
          const isLoggedIn = await isMicrosoftLoggedIn();

          if (isLoggedIn) {
            const now = new Date();
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return await getCalendarEvents(now, endDate);
          }
        } catch (err) {
          console.error('Context pre-fetch failed:', err);
        }
        return [];
      })();

      // Inactivity timeout: Auto-stop om ingen faktisk text på 10s
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('⏱️ Inaktivitet timeout (10s) - stoppar mic');
        stopAll();
      }, 10000);

      await sttRef.current.startListening((text, isFinal) => {
        console.log('📝 Transcript:', { text, isFinal });

        // Reset inactivity timer vid faktisk text
        if (text && text.trim()) {
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
          inactivityTimerRef.current = setTimeout(() => {
            console.warn('⏱️ Inaktivitet timeout (10s) - stoppar mic');
            stopAll();
          }, 10000);
        }

        if (isFinal) {
          // Final transcript - accumulated
          console.log('✅ Final transcript:', text);
          setFinalText(text);
          finalTextRef.current = text; // Sync till ref för callback
        }
        // Partial updates visas inte i ChatUI (bara för logging)
      });

    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Kunde inte starta mikrofon');
      toast.error('Mikrofon-åtkomst nekad');
      setVoiceState('idle');
    }
  }, []);

  /**
   * STOP ALL - Avbryt allt (recording, processing, TTS)
   */
  const stopAll = useCallback(() => {
    console.log('🛑 STOP ALL - avbryter allt');

    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // Stop mic
    sttRef.current?.stopListening();

    // Stop TTS
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    ttsQueueRef.current = [];

    // Reset state
    setVoiceState('idle');
    setFinalText('');
    finalTextRef.current = '';

    toast('Avbrutet', { icon: '🛑' });
  }, []);

  /**
   * Send message to Claude and get response
   * @param userMessage User's message
   * @param useTTS Om TTS ska användas (true för röst-input, false för text-input)
   */
  const sendToClaude = async (userMessage: string, useTTS: boolean = true) => {
    if (!claudeRef.current) {
      toast.error('AI-assistent inte tillgänglig');
      return;
    }

    setVoiceState('processing');

    try {
      // OPTIMERING: Använd pre-fetched context (hämtades under inspelning!)
      let calendarEvents: any[] = [];
      if (contextPromiseRef.current) {
        console.log('📊 Using pre-fetched context (saved ~400ms)');
        calendarEvents = await contextPromiseRef.current;
        contextPromiseRef.current = null; // Reset för nästa turn
      } else {
        console.log('📊 Fetching context now (no pre-fetch)');
        try {
          const { getCalendarEvents, isMicrosoftLoggedIn } = await import('@/services/microsoft-graph');
          const isLoggedIn = await isMicrosoftLoggedIn();

          if (isLoggedIn) {
            const now = new Date();
            const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            calendarEvents = await getCalendarEvents(now, endDate);
          }
        } catch (err) {
          console.error('Failed to fetch calendar:', err);
        }
      }

      claudeRef.current.updateContext({ tasks, calendarEvents });

      // Send till Claude MED STREAMING
      console.log('🤖 Streaming from Claude:', userMessage, useTTS ? '(with TTS)' : '(text only)');

      let fullResponse = '';
      let currentSentence = '';

      await claudeRef.current.chatStreaming(userMessage, (chunk) => {
        // Chunk kommer in löpande från Claude
        fullResponse += chunk;
        currentSentence += chunk;

        // Uppdatera UI i realtid
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            // Uppdatera sista meddelandet
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, text: fullResponse }
            ];
          } else {
            // Nytt assistant message
            return [
              ...prev,
              { role: 'assistant', text: fullResponse, timestamp: new Date() }
            ];
          }
        });

        // Azure TTS: Sentence-by-sentence (endast om useTTS)
        if (useTTS && /[.!?]\s*$/.test(chunk.trim())) {
          const sentenceToPlay = currentSentence.trim();
          if (sentenceToPlay.length > 10) {
            console.log('🔊 Playing sentence:', sentenceToPlay);
            playAzureTTS(sentenceToPlay);
          }
          currentSentence = '';
        }
      });

      // Azure TTS: Spela sista biten om ingen avslutande punkt
      if (useTTS && currentSentence.trim()) {
        await playAzureTTS(currentSentence.trim());
      }

      // Spara conversation history till Redis
      await saveConversationHistory();

    } catch (err) {
      console.error('Claude error:', err);
      setError('Kunde inte få svar från AI');
      toast.error('AI-fel: ' + (err instanceof Error ? err.message : 'Okänt fel'));
      setVoiceState('idle');
    }
  };


  /**
   * Clear conversation
   */
  const clearConversation = () => {
    setMessages([]);
    claudeRef.current?.clearHistory();
    setFinalText('');
    finalTextRef.current = '';
    toast.success('Konversation rensad');
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* ChatUI Block - helt separerad från voice-controls */}
      <div style={{ width: '100%' }}>
        {/* Header med Rensa-knapp */}
        {messages.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--color-sf-black)',
              opacity: 0.6,
              textTransform: 'uppercase'
            }}>
              Konversation
            </span>
            <ButtonComponent
              cssClass="e-flat e-small"
              iconCss="e-icons e-close"
              content="Rensa"
              onClick={clearConversation}
            />
          </div>
        )}

        {/* ChatUI med minHeight, låter växa med innehåll */}
        <div style={{ width: '100%', minHeight: '200px', display: 'block' }}>
          <ChatUIComponent
            user={currentUserModel}
            showTimeBreak={false}
            showFooter={true}
            placeholder="Skriv till AI..."
            messages={messages.map(msg => ({
              text: msg.text,
              author: msg.role === 'user' ? currentUserModel : assistantUser,
              timeStamp: msg.timestamp
            }))}
            messageSend={(args: any) => {
              // När användaren skickar meddelande via ChatUI (text-input = INGEN TTS!)
              const userMessage: Message = {
                role: 'user',
                text: args.message.text,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, userMessage]);
              sendToClaude(args.message.text, false); // useTTS=false för text-input!
            }}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Voice controls - hands-free mode */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        marginTop: '16px'
      }}>
        {/* State 1: IDLE */}
        {voiceState === 'idle' && (
          <ButtonComponent
            iconCss="e-icons e-microphone"
            cssClass="e-primary"
            onClick={handleStartRecording}
            disabled={!servicesReady}
          >
            Börja prata
          </ButtonComponent>
        )}

        {/* State 2: RECORDING */}
        {voiceState === 'recording' && (
          <ButtonComponent
            iconCss="e-icons e-pause"
            cssClass="e-danger"
            onClick={stopAll}
            style={{ animation: 'pulse 1.5s ease-in-out infinite' } as any}
          >
            Stoppa
          </ButtonComponent>
        )}

        {/* State 3: PAUSED */}
        {voiceState === 'paused' && (
          <>
            <div style={{
              fontSize: '14px',
              color: 'var(--warning-600)',
              fontWeight: 600
            }}>
              Analyserar...
            </div>
            <ButtonComponent
              iconCss="e-icons e-close"
              cssClass="e-flat e-small"
              onClick={stopAll}
            >
              Avbryt
            </ButtonComponent>
          </>
        )}

        {/* State 4: PROCESSING */}
        {voiceState === 'processing' && (
          <>
            <div style={{
              fontSize: '14px',
              color: 'var(--primary-600)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="e-icons e-spinner" style={{
                fontSize: '16px',
                animation: 'spin 1s linear infinite'
              }} />
              AI tänker...
            </div>
            <ButtonComponent
              iconCss="e-icons e-close"
              cssClass="e-flat e-small"
              onClick={stopAll}
            >
              Avbryt
            </ButtonComponent>
          </>
        )}

        {/* State 5: PLAYING_TTS */}
        {voiceState === 'playing_tts' && (
          <>
            <div style={{
              fontSize: '14px',
              color: 'var(--success-600)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="e-icons e-volume" style={{
                fontSize: '16px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
              Spelar upp...
            </div>
            <ButtonComponent
              iconCss="e-icons e-close"
              cssClass="e-flat e-small"
              onClick={stopAll}
            >
              Avbryt uppläsning
            </ButtonComponent>
          </>
        )}
      </div>
    </>
  );
}
