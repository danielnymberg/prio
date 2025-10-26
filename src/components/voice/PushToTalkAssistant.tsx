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

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function PushToTalkAssistant() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [servicesReady, setServicesReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Context pre-fetching: Hämta under inspelning för snabbare respons
  const contextPromiseRef = useRef<Promise<any> | null>(null);

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const ttsRef = useRef<SimpleTTS | null>(null);
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();

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
      setFinalText('');
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
          // Final transcript - ackumulera
          setFinalText(prev => prev + (prev ? ' ' : '') + text);
          setPartialText('');
        } else {
          // Partial - visa live
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

    // Stoppa STT och VÄNTA på EndOfUtterance från Speechmatics
    await sttRef.current?.stopListening(true);  // ✅ true = använd accumulated transcript!

    // Kombinera final + partial
    const fullTranscript = (finalText + (partialText ? ' ' : '') + partialText).trim();

    if (!fullTranscript) {
      console.warn('⚠️ No transcript captured');
      toast('Inget ljud upptäcktes', { icon: '🎤' });
      setPartialText('');
      setFinalText('');
      return;
    }

    console.log('✅ Full transcript:', fullTranscript);

    // Lägg till user message
    const userMessage: Message = {
      role: 'user',
      text: fullTranscript,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Rensa transcript
    setPartialText('');
    setFinalText('');

    // Send till Claude
    await sendToClaude(fullTranscript);

  }, [finalText, partialText]);

  /**
   * Send message to Claude and get response
   */
  const sendToClaude = async (userMessage: string) => {
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
      console.log('🤖 Streaming from Claude:', userMessage);

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

        // När mening är klar, lägg till i TTS-kö
        if (/[.!?]\s*$/.test(currentSentence.trim()) && currentSentence.trim().length > 10) {
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

      // Läs upp sista biten om mening inte slutade med punkt
      if (ttsRef.current && currentSentence.trim()) {
        await ttsRef.current.speakQueued(currentSentence.trim()).catch(err => {
          console.warn('Final TTS error:', err);
        });
      }

      // Vänta på att TTS-kön är klar
      await new Promise(resolve => {
        const checkQueue = setInterval(() => {
          if (!ttsRef.current || !ttsRef.current.getIsSpeaking()) {
            clearInterval(checkQueue);
            setIsSpeaking(false);
            resolve(true);
          }
        }, 100);
      });

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
    setFinalText('');
    toast.success('Konversation rensad');
  };

  if (!user) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px',
      gap: '24px',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Conversation History */}
      {messages.length > 0 && (
        <div style={{
          width: '100%',
          background: 'var(--e-surface)',
          borderRadius: '12px',
          padding: '16px',
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid var(--e-border)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--e-text-secondary)',
              textTransform: 'uppercase'
            }}>
              Konversation
            </span>
            <button
              onClick={clearConversation}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--e-text-secondary)',
                cursor: 'pointer',
                fontSize: '11px',
                padding: '4px 8px'
              }}
            >
              Rensa
            </button>
          </div>

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: i < messages.length - 1 ? '12px' : '0'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: '16px',
                background: msg.role === 'user' ? 'var(--primary-600)' : 'var(--e-surface-variant)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--e-text)',
                border: msg.role === 'assistant' ? '1px solid var(--e-border)' : 'none'
              }}>
                <p style={{ fontSize: '14px', margin: '0 0 4px 0', lineHeight: 1.5 }}>
                  {msg.text}
                </p>
                <p style={{
                  fontSize: '11px',
                  opacity: 0.7,
                  margin: 0
                }}>
                  {msg.timestamp.toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Push-to-Talk Button */}
      <VoicePushToTalkButton
        onRecordingStart={handleRecordingStart}
        onRecordingStop={handleRecordingStop}
        disabled={!servicesReady}
        isProcessing={isProcessing}
        partialTranscript={partialText || finalText}
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

    </div>
  );
}
