import { useState, useRef, useEffect } from 'react';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Textarea } from '@/components/ui/Textarea';
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
  const [mode, setMode] = useState<'note' | 'ai'>('ai');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    // Load chat history from localStorage on mount
    try {
      const saved = localStorage.getItem('prio_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const claudeRef = useRef<ClaudeConversation | null>(null);
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Save chat history to localStorage with debounce (500ms)
  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('prio_chat_history', JSON.stringify(chatHistory));

        // Also save in Claude's format for conversation continuity
        const claudeFormat = chatHistory.map(msg => ({
          role: msg.role,
          content: msg.text,
        }));
        localStorage.setItem('prio_claude_conversation', JSON.stringify(claudeFormat));
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chatHistory]);

  // Initialize Claude
  useEffect(() => {
    const initializeClaude = async () => {
      if (!claudeRef.current && user) {
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

        // Load previous conversation history for Claude
        let conversationHistory: any[] = [];
        try {
          const saved = localStorage.getItem('prio_claude_conversation');
          if (saved) {
            conversationHistory = JSON.parse(saved);
          }
        } catch (error) {
          console.error('Failed to load Claude conversation:', error);
        }

        claudeRef.current = new ClaudeConversation(
          {
            tasks,
            projects,
            calendarEvents,
            recentFiles: [],
            conversationHistory, // Restore previous conversation
            userId: user.id,
          },
          {
            onTaskCreate: createTask,
            onTaskUpdate: updateTask,
            onTaskDelete: deleteTask,
          }
        );
      }
    };

    initializeClaude();
  }, [tasks, createTask, updateTask, deleteTask, user]);

  // Auto-scroll chat only for user messages, not for assistant responses
  useEffect(() => {
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      // Only auto-scroll if the last message is from the user
      if (lastMessage.role === 'user') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
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
    localStorage.removeItem('prio_chat_history');
    localStorage.removeItem('prio_claude_conversation');
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
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '96px',
          zIndex: 50,
          background: 'linear-gradient(to right, var(--copper-600), var(--copper-600))',
          color: 'white',
          borderRadius: '9999px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s',
          border: 'none',
          cursor: 'pointer',
          minHeight: '56px',
          minWidth: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Snabb anteckning eller AI-chat"
        aria-label="Öppna quick actions"
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Zap style={{ height: '24px', width: '24px' }} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '96px',
      zIndex: 50,
      backgroundColor: 'var(--e-surface)',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: '2px solid var(--copper-500)',
      width: '384px',
      maxWidth: 'calc(100vw - 3rem)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '600px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid var(--e-border, #e5e7eb)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setMode('ai')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'colors 0.2s',
              backgroundColor: mode === 'ai' ? '#f3e8ff' : 'transparent',
              color: mode === 'ai' ? '#7e22ce' : 'var(--e-text-secondary, #6b7280)',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (mode !== 'ai') e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)';
            }}
            onMouseLeave={(e) => {
              if (mode !== 'ai') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Sparkles style={{ height: '16px', width: '16px' }} />
            AI
          </button>
          <button
            onClick={() => setMode('note')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'colors 0.2s',
              backgroundColor: mode === 'note' ? 'var(--e-surface)' : 'transparent',
              color: mode === 'note' ? 'var(--copper-600)' : 'var(--e-text-secondary, #6b7280)',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (mode !== 'note') e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)';
            }}
            onMouseLeave={(e) => {
              if (mode !== 'note') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Plus style={{ height: '16px', width: '16px' }} />
            Anteckning
          </button>
        </div>
        <button
          onClick={() => {
            setNote('');
            setIsExpanded(false);
          }}
          style={{
            padding: '4px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          aria-label="Stäng"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <X style={{ height: '16px', width: '16px', color: 'var(--e-text-secondary, #6b7280)' }} />
        </button>
      </div>

      {/* AI Chat History */}
      {mode === 'ai' && chatHistory.length > 0 && (
        <div style={{
          flex: '1',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: '200px',
          maxHeight: '400px'
        }}>
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  backgroundColor: msg.role === 'user' ? 'var(--copper-600)' : 'var(--e-hover, #f3f4f6)',
                  color: msg.role === 'user' ? 'white' : 'var(--e-text)'
                }}
              >
                <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
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
        <div style={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          minHeight: '200px'
        }}>
          <div style={{ textAlign: 'center', color: 'var(--e-text-secondary, #6b7280)' }}>
            <Sparkles style={{ height: '48px', width: '48px', margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Fråga AI-assistenten</p>
            <p style={{ fontSize: '12px' }}>
              Skapa uppgifter, få hjälp med prioritering,<br />eller fråga vad som helst!
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--e-border, #e5e7eb)'
      }}>
        {mode === 'ai' && chatHistory.length > 0 && (
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              style={{
                color: 'var(--e-text-secondary, #6b7280)',
                fontSize: '12px'
              }}
            >
              <Trash2 style={{ height: '12px', width: '12px', marginRight: '4px' }} />
              Rensa chat
            </Button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Textarea
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
            style={{ width: '100%', maxHeight: '128px' }}
            rows={3}
            disabled={isProcessing}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={handleSubmit}
              disabled={!note.trim() || isProcessing}
              style={{ flex: '1' }}
              size="md"
            >
              {isProcessing ? (
                <>
                  <div style={{
                    animation: 'spin 1s linear infinite',
                    borderRadius: '9999px',
                    height: '16px',
                    width: '16px',
                    borderBottom: '2px solid white',
                    marginRight: '8px'
                  }} />
                  AI tänker...
                </>
              ) : mode === 'note' ? (
                <>
                  <Plus style={{ height: '16px', width: '16px', marginRight: '4px' }} />
                  {isProcessing ? 'Lägger till...' : 'Lägg till'}
                </>
              ) : (
                <>
                  <MessageSquare style={{ height: '16px', width: '16px', marginRight: '4px' }} />
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

        <p style={{
          fontSize: '12px',
          color: 'var(--e-text-secondary, #6b7280)',
          marginTop: '8px'
        }}>
          {mode === 'note' ? (
            <>💡 Enter = lägg till, Shift+Enter = ny rad, Esc = avbryt</>
          ) : (
            <>✨ Enter = skicka, Shift+Enter = ny rad. AI kan skapa uppgifter & hjälpa dig!</>
          )}
        </p>
      </div>
    </div>
  );
}
