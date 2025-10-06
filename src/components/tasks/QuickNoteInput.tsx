import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Zap, X, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { ClaudeConversation } from '@/services/claude-conversation';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function QuickNoteInput() {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'note' | 'ai'>('note');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const { tasks, createTask, updateTask } = useTasks();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Claude
  useEffect(() => {
    const initializeClaude = async () => {
      if (import.meta.env.VITE_ANTHROPIC_API_KEY && !claudeRef.current && user) {
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
    };

    initializeClaude();
  }, [tasks, createTask, updateTask, user]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleQuickAdd = async () => {
    if (!note.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      await createTask({
        title: note.trim(),
        value_score: 5,
        time_sensitivity: 5,
        confidence: 7,
        effort: 5,
        status: 'not_started',
      });

      toast.success('📥 Anteckning tillagd i inbox!');
      setNote('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Error creating quick note:', error);
      toast.error('Kunde inte skapa anteckning');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIChat = async () => {
    if (!note.trim() || !claudeRef.current) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: note.trim(),
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setNote('');
    setIsProcessing(true);

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
      const response = await claudeRef.current.chat(userMessage.text);

      if (response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          text: response,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      toast.error('Kunde inte få svar från AI');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    claudeRef.current?.clearHistory();
  };

  const handleSubmit = () => {
    if (mode === 'note') {
      handleQuickAdd();
    } else {
      handleAIChat();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-2xl transition-all active:scale-95 min-h-[56px] min-w-[56px] flex items-center justify-center"
        title="Snabb anteckning eller AI-chat"
        aria-label="Öppna quick actions"
      >
        <Zap className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 w-96 max-w-[calc(100vw-3rem)] flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('note')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              mode === 'note'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Plus className="h-4 w-4" />
            Anteckning
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              mode === 'ai'
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI
          </button>
        </div>
        <button
          onClick={() => {
            setNote('');
            setIsExpanded(false);
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="Stäng"
        >
          <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* AI Chat History */}
      {mode === 'ai' && chatHistory.length > 0 && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Empty State for AI */}
      {mode === 'ai' && chatHistory.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">Fråga AI-assistenten</p>
            <p className="text-xs">
              Skapa uppgifter, få hjälp med prioritering,<br />eller fråga vad som helst!
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {mode === 'ai' && chatHistory.length > 0 && (
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-gray-500 hover:text-gray-700 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Rensa chat
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              mode === 'note'
                ? 'Vad vill du komma ihåg?'
                : 'Fråga AI-assistenten...'
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                setNote('');
                setIsExpanded(false);
              }
            }}
            autoFocus
            className="w-full"
            disabled={isProcessing}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={!note.trim() || isProcessing}
              className="flex-1"
              size="md"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  AI tänker...
                </>
              ) : mode === 'note' ? (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  {isProcessing ? 'Lägger till...' : 'Lägg till'}
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Skicka
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setNote('');
                setIsExpanded(false);
              }}
              size="md"
            >
              Avbryt
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {mode === 'note' ? (
            <>💡 Enter = lägg till, Esc = avbryt. Hamnar i inbox.</>
          ) : (
            <>✨ AI kan skapa uppgifter, svara på frågor och hjälpa dig prioritera!</>
          )}
        </p>
      </div>
    </div>
  );
}
