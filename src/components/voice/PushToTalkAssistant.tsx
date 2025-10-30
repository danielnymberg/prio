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
// import { SpeechmaticsSTT } from '@/services/speechmatics-stt'; // COMMENTED OUT - Using Soniox instead
import { SonioxSTT } from '@/services/soniox-stt';
import { ClaudeConversation } from '@/services/claude-conversation';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ChatUIComponent, UserModel } from '@syncfusion/ej2-react-interactive-chat';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { marked } from 'marked';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

type VoiceState = 'idle' | 'recording' | 'paused' | 'processing' | 'playing_tts';

/**
 * Strip markdown formatting from text before TTS
 * Removes: **bold**, *italic*, `code`, [links](url), etc.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')       // *italic* → italic
    .replace(/__(.+?)__/g, '$1')       // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')         // _italic_ → italic
    .replace(/`(.+?)`/g, '$1')         // `code` → code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [text](url) → text
    .replace(/#{1,6}\s/g, '')          // # headers → remove #
    .replace(/>\s/g, '')               // > blockquote → remove >
    .replace(/[-*+]\s/g, '')           // - list → remove -
    .replace(/\d+\.\s/g, '');          // 1. list → remove number
}

/**
 * Parse markdown to HTML for ChatUI display
 * Supports: links, bold, italic, code
 */
function parseMarkdown(text: string): string {
  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Use sync parse (not async parseInline)
  let html = marked.parse(text, { async: false }) as string;

  // Remove wrapping <p> tags
  html = html.replace(/^<p>|<\/p>$/g, '').trim();

  // Sanitize: Remove scripts and event handlers
  const safeHtml = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '');

  return safeHtml;
}

export function PushToTalkAssistant() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [finalText, setFinalText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [servicesReady, setServicesReady] = useState(false);
  const [partialText, setPartialText] = useState(''); // Live transcript från STT

  // Context pre-fetching: Hämta under inspelning för snabbare respons
  const contextPromiseRef = useRef<Promise<any> | null>(null);

  const sttRef = useRef<SonioxSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const finalTextRef = useRef<string>(''); // Ref för EndOfUtterance callback
  const ttsQueueRef = useRef<string[]>([]); // TTS sentence queue
  const isTTSPlayingRef = useRef<boolean>(false); // TTS state flag
  const wasInterruptedRef = useRef<boolean>(false); // Track if user interrupted TTS
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null); // Auto-stop timeout
  const handleStartRecordingRef = useRef<(() => Promise<void>) | null>(null); // Ref för circular dep
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
  const historyLoadedRef = useRef(false); // Prevent double-loading
  const loadConversationHistory = useCallback(async () => {
    // Prevent duplicate loads (React StrictMode in dev runs useEffect twice)
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;

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

        console.log('✅ Loaded conversation history:', history.length, 'messages');
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
   * Play next sentence from TTS queue
   */
  const playNextInQueue = useCallback(() => {
    if (ttsQueueRef.current.length === 0) {
      console.log('✅ TTS queue tom - auto-restart recording');
      isTTSPlayingRef.current = false;

      // Auto-restart recording efter TTS (om inte manuellt avbruten)
      if (!wasInterruptedRef.current && handleStartRecordingRef.current) {
        setTimeout(() => {
          handleStartRecordingRef.current?.();
        }, 300);
      } else {
        setVoiceState('idle');
        wasInterruptedRef.current = false; // Reset för nästa gång
      }
      return;
    }

    const nextSentence = ttsQueueRef.current.shift()!;
    playBrowserTTS(nextSentence);
  }, []);

  /**
   * Browser TTS playback with queue (ONE sentence at a time)
   */
  const playBrowserTTS = useCallback((text: string) => {
    try {
      if (!window.speechSynthesis) {
        console.warn('Browser TTS not supported');
        playNextInQueue(); // Skip to next in queue
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Get speed from localStorage
      const speedPref = localStorage.getItem('prio-tts-speed') || 'normal';
      let speed = 1.2;
      if (speedPref === 'slow') speed = 1.0;
      else if (speedPref === 'fast') speed = 1.5;
      utterance.rate = speed;

      // Swedish voice
      const voices = window.speechSynthesis.getVoices();
      const swedishVoice = voices.find(v => v.lang.startsWith('sv'));
      if (swedishVoice) utterance.voice = swedishVoice;

      utterance.onstart = () => {
        console.log('🔊 TTS started - pausing STT temporarily');
        setVoiceState('playing_tts');
        isTTSPlayingRef.current = true;

        // Stop STT during TTS (prevent feedback loop)
        sttRef.current?.stopListening();
        sttRef.current?.resetTranscript();
        setFinalText('');

        // Clear inactivity timer during TTS
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      };

      utterance.onend = () => {
        console.log('🔊 TTS sentence finished');
        isTTSPlayingRef.current = false;

        // Play next in queue
        playNextInQueue();
      };

      utterance.onerror = (error) => {
        console.error('Browser TTS error:', error);
        isTTSPlayingRef.current = false;

        // If interrupted by user → continue to recording
        if (error.error === 'interrupted') {
          wasInterruptedRef.current = true;
          console.log('🔇 TTS interrupted by user - clearing queue');
          ttsQueueRef.current = []; // Clear rest of queue
          setVoiceState('recording'); // Go to recording state
        } else {
          // Other errors → try next in queue
          playNextInQueue();
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Browser TTS failed:', error);
      playNextInQueue();
    }
  }, [playNextInQueue]);


  /**
   * Initialize services
   */
  useEffect(() => {
    if (!user) return;

    const initServices = async () => {
      try {
        // Initialize STT with Soniox
        sttRef.current = new SonioxSTT();

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
        sttRef.current.setOnEndOfUtteranceCallback(async () => {
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

                  // Browser TTS sentence-by-sentence
                  if (/[.!?]\s*$/.test(chunk.trim()) && currentSentence.trim().length > 10) {
                    const cleanSentence = stripMarkdown(currentSentence.trim());
                    console.log('🔊 Playing sentence:', cleanSentence);
                    playBrowserTTS(cleanSentence);
                    currentSentence = '';
                  }
                });

                // Final sentence
                if (currentSentence.trim()) {
                  playBrowserTTS(stripMarkdown(currentSentence.trim()));
                }

                // Save to Redis
                await saveConversationHistory();

                // Sätt tillbaka till idle om ingen TTS körs
                // (playBrowserTTS sätter 'playing_tts' vid onstart)
                setTimeout(() => {
                  if (!isTTSPlayingRef.current && ttsQueueRef.current.length === 0) {
                    setVoiceState('idle');
                  }
                }, 100);
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
      sttRef.current?.destroy();
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

      // Interrupt TTS if playing
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        console.log('🔇 Interrupting TTS playback');
        wasInterruptedRef.current = true; // Flag that user interrupted
        window.speechSynthesis.cancel(); // This triggers onerror='interrupted'
        ttsQueueRef.current = []; // Clear remaining queue
      }

      setVoiceState('recording');
      setFinalText('');
      setPartialText(''); // Clear old partial
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
        console.warn('⏱️ Inaktivitet timeout (5s) - stoppar mic');
        stopAll();
      }, 5000);

      await sttRef.current.startListening((text, isFinal) => {
        console.log('📝 Transcript:', { text, isFinal });

        // Reset inactivity timer vid faktisk text
        if (text && text.trim()) {
          if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
          }
          inactivityTimerRef.current = setTimeout(() => {
            console.warn('⏱️ Inaktivitet timeout (5s) - stoppar mic');
            stopAll();
          }, 5000);
        }

        if (isFinal) {
          // Final transcript - accumulated
          console.log('✅ Final transcript:', text);
          setFinalText(text);
          finalTextRef.current = text; // Sync till ref för callback
          setPartialText(''); // Rensa partial när final kommer
        } else {
          // Partial transcript - visa live feedback! ✅
          console.log('⏳ Partial transcript:', text);
          setPartialText(text);
        }
      });

    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Kunde inte starta mikrofon');
      toast.error('Mikrofon-åtkomst nekad');
      setVoiceState('idle');
    }
  }, []);

  // Update ref for circular dependency
  useEffect(() => {
    handleStartRecordingRef.current = handleStartRecording;
  }, [handleStartRecording]);

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

    // Stop browser TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

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

        // Queue TTS sentences (instead of playing immediately)
        if (useTTS && /[.!?]\s*$/.test(chunk.trim())) {
          const sentenceToPlay = currentSentence.trim();
          if (sentenceToPlay.length > 10) {
            const cleanSentence = stripMarkdown(sentenceToPlay);
            console.log('🔊 Queueing sentence:', cleanSentence);

            // Add to queue
            ttsQueueRef.current.push(cleanSentence);

            // Start playing if not already playing
            if (!isTTSPlayingRef.current) {
              playNextInQueue();
            }
          }
          currentSentence = '';
        }
      });

      // Queue final sentence if any
      if (useTTS && currentSentence.trim()) {
        const cleanSentence = stripMarkdown(currentSentence.trim());
        ttsQueueRef.current.push(cleanSentence);

        // Start playing if not already playing
        if (!isTTSPlayingRef.current) {
          playNextInQueue();
        }
      }

      // Om inte TTS, sätt tillbaka till idle (TTS hanterar detta själv)
      if (!useTTS) {
        setVoiceState('idle');
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


  if (!user) {
    return null;
  }

  return (
    <>
      {/* ChatUI Block - helt separerad från voice-controls */}
      <div style={{ width: '100%' }}>
        {/* Header */}
        {messages.length > 0 && (
          <div style={{
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
          </div>
        )}

        {/* Live partial transcript - STICKY för att alltid synas */}
        {voiceState === 'recording' && partialText && (
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            padding: '12px',
            marginBottom: '12px',
            backgroundColor: 'rgba(0, 120, 212, 0.1)',
            border: '2px solid rgba(0, 120, 212, 0.4)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(0, 120, 212, 0.8)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🎤 Lyssnar...
            </div>
            <div style={{
              fontSize: '14px',
              fontStyle: 'italic',
              color: 'rgba(0, 0, 0, 0.6)',
              lineHeight: '1.5'
            }}>
              {partialText}
            </div>
          </div>
        )}

        {/* ChatUI med fixed height + scroll */}
        <div style={{ width: '100%', height: '500px', display: 'flex', flexDirection: 'column' }}>
          <ChatUIComponent
            height="500px"
            user={currentUserModel}
            showTimeBreak={false}
            showFooter={true}
            placeholder="Skriv till AI..."
            messages={messages.map(msg => ({
              text: msg.text,
              author: msg.role === 'user' ? currentUserModel : assistantUser,
              timeStamp: msg.timestamp
            }))}
            messageTemplate={(context: any) => {
              const msg = context.message;
              const isUser = msg.author.id === currentUserModel.id;

              return (
                <div className="e-message-wrapper" style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    maxWidth: '75%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: isUser ? 'var(--color-sf-primary)' : 'var(--color-sf-grey-100)',
                    color: isUser ? 'white' : 'var(--color-sf-black)'
                  }}>
                    <div
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word'
                      }}
                      className="markdown-content"
                    />
                  </div>
                </div>
              );
            }}
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
              cssClass="e-danger"
              onClick={stopAll}
              style={{
                width: '200px',
                height: '60px',
                fontSize: '18px',
                fontWeight: 700
              } as any}
            >
              🛑 STOPPA
            </ButtonComponent>
          </>
        )}
      </div>
    </>
  );
}
