import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SpeechmaticsSTT } from '@/services/speechmatics-stt';
import { AzureTTS } from '@/services/azure-tts';
import { ClaudeConversation } from '@/services/claude-conversation';
import { useTasks } from '@/hooks/useTasks';

interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function VoiceInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationLog, setConversationLog] = useState<ConversationMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sttRef = useRef<SpeechmaticsSTT | null>(null);
  const ttsRef = useRef<AzureTTS | null>(null);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const { tasks, createTask, updateTask } = useTasks();

  useEffect(() => {
    initializeServices();

    // Proper cleanup function
    return () => {
      // Stop active services
      if (sttRef.current) {
        sttRef.current.stopListening();
      }
      if (ttsRef.current) {
        ttsRef.current.stop();
      }

      // Clear references to allow garbage collection
      sttRef.current = null;
      ttsRef.current = null;
      claudeRef.current = null;
    };
  }, []);

  // Listen for voice trigger events
  useEffect(() => {
    const handleVoiceTrigger = () => {
      if (!isListening && !isSpeaking) {
        handleStartListening();
      }
    };

    window.addEventListener('trigger-voice', handleVoiceTrigger);

    return () => {
      window.removeEventListener('trigger-voice', handleVoiceTrigger);
    };
  }, [isListening, isSpeaking]);

  const initializeServices = async () => {
    try {
      // Initialize TTS
      if (import.meta.env.VITE_AZURE_SPEECH_KEY) {
        ttsRef.current = new AzureTTS({
          subscriptionKey: import.meta.env.VITE_AZURE_SPEECH_KEY,
          region: import.meta.env.VITE_AZURE_SPEECH_REGION || 'westeurope',
          voice: 'sv-SE-SofieNeural',
        });
      }

      // Initialize STT
      if (import.meta.env.VITE_SPEECHMATICS_KEY) {
        sttRef.current = new SpeechmaticsSTT({
          apiKey: import.meta.env.VITE_SPEECHMATICS_KEY,
          language: 'sv',
        });
      }

      // Initialize Claude
      if (import.meta.env.VITE_ANTHROPIC_API_KEY) {
        claudeRef.current = new ClaudeConversation(
          {
            tasks,
            calendarEvents: [],
            recentFiles: [],
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

  const handleStartListening = async () => {
    if (!sttRef.current) {
      setError('Röstigenkänning inte tillgänglig');
      return;
    }

    try {
      setIsListening(true);
      setTranscript('');
      setError(null);

      await sttRef.current.startListening((text, isFinal) => {
        setTranscript(text);

        if (isFinal && text.trim()) {
          handleUserMessage(text);
        }
      });
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Kunde inte starta röstigenkänning');
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    setIsListening(false);
    sttRef.current?.stopListening();
  };

  const handleUserMessage = async (message: string) => {
    // Lägg till i log
    const userMessage: ConversationMessage = {
      role: 'user',
      text: message,
      timestamp: new Date(),
    };
    setConversationLog(prev => [...prev, userMessage]);

    // Rensa transcript
    setTranscript('');
    setIsListening(false);
    sttRef.current?.stopListening();

    if (!claudeRef.current) {
      setError('AI-assistent inte tillgänglig');
      return;
    }

    try {
      // Uppdatera Claude context med senaste tasks
      claudeRef.current.updateContext({ tasks });

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

        // Speak response
        if (ttsRef.current) {
          setIsSpeaking(true);
          try {
            await ttsRef.current.speak(response);
          } catch (error) {
            console.error('TTS error:', error);
          } finally {
            setIsSpeaking(false);
          }
        }
      }
    } catch (error) {
      console.error('Conversation error:', error);
      setError('Kunde inte få svar från AI-assistenten');
    }
  };


  const clearConversation = () => {
    setConversationLog([]);
    claudeRef.current?.clearHistory();
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

      {/* Live Transcript (when not expanded) */}
      {!isExpanded && transcript && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 w-80">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Du säger:</p>
          <p className="text-gray-900 dark:text-white">{transcript}</p>
        </div>
      )}

      {/* Voice Button */}
      <div className="relative">
        <Button
          variant={isListening ? 'secondary' : isSpeaking ? 'secondary' : 'primary'}
          size="lg"
          onClick={isListening ? handleStopListening : handleStartListening}
          onDoubleClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full w-16 h-16 shadow-2xl transition-all"
          disabled={isSpeaking}
          title={
            isSpeaking
              ? 'AI talar...'
              : isListening
              ? 'Klicka för att sluta lyssna'
              : 'Klicka för att prata, dubbelklicka för att öppna chat'
          }
        >
          {isSpeaking ? (
            <Volume2 className="h-8 w-8 animate-pulse" />
          ) : isListening ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {/* Pulsing Animation */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
        )}

        {/* Speaking Animation */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-30" />
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