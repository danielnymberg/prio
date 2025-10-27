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
import { VoicePushToTalkButton } from './VoicePushToTalkButton';
import { SpeechmaticsSTT } from '@/services/speechmatics-stt';
import { ClaudeConversation } from '@/services/claude-conversation';
import { SimpleTTS } from '@/services/audio/SimpleTTS';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ChatUIComponent, MessagesDirective, MessageDirective, UserModel } from '@syncfusion/ej2-react-interactive-chat';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function PushToTalkAssistant() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [servicesReady, setServicesReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Context pre-fetching: Hämta under inspelning för snabbare respons
  const contextPromiseRef = useRef<Promise<any> | null>(null);

  // Accumulated transcript från STT (använd ref istället för state för att undvika race conditions)
  const accumulatedTranscriptRef = useRef<string>('');

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const ttsRef = useRef<SimpleTTS | null>(null);
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
   * Initialize services
   */
  useEffect(() => {
    if (!user) return;

    const initServices = async () => {
      try {
        // Initialize STT
        sttRef.current = new SpeechmaticsSTT();

        // Initialize TTS
        ttsRef.current = new SimpleTTS();

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
  }, [user]);

  /**
   * Update Claude context when tasks change
   */
  useEffect(() => {
    if (claudeRef.current && tasks) {
      claudeRef.current.updateContext({ tasks });
    }
  }, [tasks]);

  /**
   * START recording - när användaren håller in knappen
   */
  const handleRecordingStart = useCallback(async () => {
    if (!sttRef.current) {
      toast.error('Röstigenkänning inte tillgänglig');
      return;
    }

    // KRITISKT: Stoppa pågående TTS innan ny inspelning
    if (isSpeaking) {
      ttsRef.current?.stop();
      setIsSpeaking(false);
    }

    try {
      console.log('🎤 Starting STT...');
      setPartialText('');
      accumulatedTranscriptRef.current = '';
      setError(null);

      // OPTIMERING: Pre-fetch context MEDAN användaren pratar (sparar 400ms!)
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

      await sttRef.current.startListening((text, isFinal) => {
        console.log('📝 Transcript:', { text, isFinal });

        if (isFinal) {
          // Final transcript - spara i ref (detta är den accumulated transcript!)
          console.log('✅ Final accumulated transcript:', text);
          accumulatedTranscriptRef.current = text;
          setPartialText('');
        } else {
          // Partial - visa live (endast för UI-feedback)
          setPartialText(text);
        }
      });

    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Kunde inte starta mikrofon');
      toast.error('Mikrofon-åtkomst nekad');
    }
  }, []);

  /**
   * STOP recording - när användaren släpper knappen
   * AUTO-SEND till Claude!
   */
  const handleRecordingStop = useCallback(async () => {
    console.log('🛑 Stopping STT...');

    // Stoppa STT och vänta på final transcript via callback
    await sttRef.current?.stopListening(true);  // ✅ true = skicka accumulated via callback

    // Använd accumulated från ref (callback sätter detta med isFinal: true)
    const fullTranscript = accumulatedTranscriptRef.current.trim();

    if (!fullTranscript) {
      console.warn('⚠️ No transcript captured');
      toast('Inget ljud upptäcktes', { icon: '🎤' });
      setPartialText('');
      accumulatedTranscriptRef.current = '';
      return;
    }

    console.log('✅ Using accumulated transcript:', fullTranscript);

    // Lägg till user message
    const userMessage: Message = {
      role: 'user',
      text: fullTranscript,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Rensa transcript
    setPartialText('');
    accumulatedTranscriptRef.current = '';

    // Send till Claude
    await sendToClaude(fullTranscript);

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

    setIsProcessing(true);

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

        // TTS: Endast om useTTS är true (röst-input)
        if (useTTS && /[.!?]\s*$/.test(currentSentence.trim()) && currentSentence.trim().length > 10) {
          console.log('🔊 Queuing sentence:', currentSentence.trim());

          if (ttsRef.current) {
            setIsSpeaking(true);
            // Använd queued för att meningar spelas upp i ordning
            ttsRef.current.speakQueued(currentSentence.trim()).catch(err => {
              console.warn('TTS error:', err);
            });
          }

          currentSentence = '';
        }
      });

      // TTS: Läs upp sista biten om mening inte slutade med punkt (endast om useTTS)
      if (useTTS && ttsRef.current && currentSentence.trim()) {
        await ttsRef.current.speakQueued(currentSentence.trim()).catch(err => {
          console.warn('Final TTS error:', err);
        });
      }

      // TTS: Vänta på att TTS-kön är klar (endast om useTTS)
      if (useTTS) {
        await new Promise(resolve => {
          const checkQueue = setInterval(() => {
            if (!ttsRef.current || !ttsRef.current.getIsSpeaking()) {
              clearInterval(checkQueue);
              setIsSpeaking(false);
              resolve(true);
            }
          }, 100);
        });
      }

    } catch (err) {
      console.error('Claude error:', err);
      setError('Kunde inte få svar från AI');
      toast.error('AI-fel: ' + (err instanceof Error ? err.message : 'Okänt fel'));
    } finally {
      setIsProcessing(false);
    }
  };


  /**
   * Clear conversation
   */
  const clearConversation = () => {
    setMessages([]);
    claudeRef.current?.clearHistory();
    setPartialText('');
    accumulatedTranscriptRef.current = '';
    toast.success('Konversation rensad');
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '24px',
      gap: '24px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* ChatUI - Textinput + Conversation */}
      <div style={{ width: '100%', maxWidth: '600px' }}>
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

        <ChatUIComponent
          user={currentUserModel}
          showTimeBreak={false}
          showFooter={true}
          placeholder="Skriv till AI..."
          height="400px"
          width="100%"
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
        >
          <MessagesDirective>
            {messages.map((msg, i) => (
              <MessageDirective
                key={`${msg.timestamp.getTime()}-${i}`}
                text={msg.text}
                author={msg.role === 'user' ? currentUserModel : assistantUser}
                timeStamp={msg.timestamp}
              />
            ))}
          </MessagesDirective>
        </ChatUIComponent>
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

      {/* Voice controls - centrerade */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        alignSelf: 'center'
      }}>
        {/* Push-to-Talk Button */}
        <VoicePushToTalkButton
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
          disabled={!servicesReady}
          isProcessing={isProcessing}
          partialTranscript={partialText}
        />

        {/* Processing status */}
        {isProcessing && (
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
        )}

        {/* TTS Stop button - Synlig när röst spelar */}
        {isSpeaking && (
          <button
            onClick={() => {
              ttsRef.current?.stop();
              setIsSpeaking(false);
            }}
            className="e-btn e-danger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="e-icons e-close" style={{ fontSize: '14px' }}></span>
            Avbryt uppläsning
          </button>
        )}

        {/* Disconnect button - Frigör mikrofon helt (för musik etc) */}
        {servicesReady && (
          <button
            onClick={() => {
              // Stoppa TTS om igång
              if (isSpeaking) {
                ttsRef.current?.stop();
                setIsSpeaking(false);
              }

              // Disconnect STT helt (stänger WebSocket + frigör mic)
              sttRef.current?.disconnect();
              setServicesReady(false);

              toast.success('Mikrofon avstängd - kan nu lyssna på musik', {
                icon: '🔇',
                duration: 3000
              });
            }}
            className="e-btn e-danger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span className="e-icons e-close" style={{ fontSize: '14px' }}></span>
            Stäng mikrofon
          </button>
        )}
      </div>


    </div>
  );
}
