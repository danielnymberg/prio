import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(''); // Ny: visa aktuell status

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { tasks, createTask, updateTask } = useTasks();
  const { user } = useAuth();

  const initializeServices = async () => {
    if (!user) return;

    try {
      // TTS borttagen - använder text-dialog istället för att undvika feedback loop

      // Initialize STT (backend hanterar auth och config)
      sttRef.current = new SpeechmaticsSTT();

      // Initialize Claude
      if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
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

        claudeRef.current = new ClaudeConversation(
          {
            tasks,
            calendarEvents,
            recentFiles: [],
            userId: user.id,
          },
          {
            onTaskCreate: createTask,
            onTaskUpdate: updateTask,
          }
        );
      }

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

    // Rensa transcript och uppdatera status
    setTranscript('');
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
      setTranscript('');
      setError(null);
      setStatus('Ansluter...');

      await sttRef.current.startListening((text, isFinal) => {
        console.log('🎤 Transcript callback:', { text, isFinal });
        setStatus('Lyssnar...');
        setTranscript(text);
        console.log('📝 State updated - transcript:', text);

        if (isFinal && text.trim()) {
          console.log('✅ Final transcript, sending to AI');
          setStatus('Bearbetar...');
          handleUserMessage(text);
        }
      });

      // Timeout: visa varning om ingen transcript efter 5 sekunder
      setTimeout(() => {
        if (isListening && !transcript) {
          setStatus('Inget ljud upptäckt...');
        }
      }, 5000);
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Kunde inte starta röstigenkänning');
      setStatus('');
      setIsListening(false);
    }
  }, [handleUserMessage, isListening, transcript]);

  const handleStopListening = useCallback(() => {
    setIsListening(false);
    setStatus('');
    sttRef.current?.stopListening();
  }, []);

  useEffect(() => {
    if (user) {
      initializeServices();
    }

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
  }, [user, tasks]);

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
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Conversation View */}
      {isExpanded && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-96 max-h-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Prio AI-assistent
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearConversation}
                className="text-gray-500 hover:text-gray-700"
              >
                Rensa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversation Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
            {conversationLog.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Säg hej för att börja prata med din AI-assistent!</p>
              </div>
            ) : (
              conversationLog.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Live Transcript */}
          {transcript && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Du säger:</p>
              <p className="text-sm text-gray-900 dark:text-white">{transcript}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="px-4 py-2 border-t border-red-200 bg-red-50 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Status/Transcript Box (when not expanded) */}
      {!isExpanded && (status || transcript || error) && (
        <div className={`mb-4 rounded-2xl shadow-xl p-4 w-80 ${
          error
            ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
            : 'bg-white dark:bg-gray-800'
        }`}>
          {error ? (
            <>
              <p className="text-sm text-red-600 dark:text-red-400 mb-1 font-semibold">Fel:</p>
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </>
          ) : transcript ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Du säger:</p>
              <p className="text-gray-900 dark:text-white">{transcript}</p>
            </>
          ) : status ? (
            <>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Status:</p>
              <p className="text-gray-900 dark:text-white">{status}</p>
            </>
          ) : null}
        </div>
      )}

      {/* Voice Button */}
      <div className="relative">
        <Button
          variant={isListening ? 'secondary' : 'primary'}
          size="lg"
          onClick={isListening ? handleStopListening : handleStartListening}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          className="rounded-full w-16 h-16 shadow-2xl transition-all flex items-center justify-center p-0"
          title={
            isListening
              ? 'Klicka för att sluta lyssna'
              : 'Klicka för att prata, håll inne för att öppna chat'
          }
        >
          {isListening ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {/* Pulsing Animation */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
        )}

        {/* Notification Badge */}
        {conversationLog.length > 0 && !isExpanded && (
          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {conversationLog.length}
          </div>
        )}
      </div>
    </div>
  );
}