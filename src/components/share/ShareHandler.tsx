import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { ClaudeConversation } from '@/services/claude-conversation';
// Lucide icons replaced with SyncFusion e-icons
import { SyncButton as Button } from '@/components/ui/SyncButton';

export function ShareHandler() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tasks, createTask } = useTasks();
  const { user } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Analyserar delat innehåll...');
  const [createdTaskTitle, setCreatedTaskTitle] = useState('');

  useEffect(() => {
    if (user) {
      handleSharedContent();
    }
  }, [user]);

  const handleSharedContent = async () => {
    if (!user) return;

    try {
      // Extract shared data from URL params or form data
      const title = searchParams.get('title') || '';
      const text = searchParams.get('text') || '';
      const url = searchParams.get('url') || '';

      // Combine all shared content
      const sharedContent = [title, text, url].filter(Boolean).join('\n\n');

      if (!sharedContent.trim()) {
        setStatus('error');
        setMessage('Inget innehåll att dela');
        return;
      }

      setMessage('Claude analyserar innehållet...');

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

      // Create conversation with Claude
      const conversation = new ClaudeConversation(
        {
          tasks,
          projects,
          calendarEvents,
          recentFiles: [],
          userId: user.id,
        },
        {
          onTaskCreate: createTask,
        }
      );

      // Ask Claude to analyze and create task
      const prompt = `Analysera detta delade innehåll och skapa en task:\n\n${sharedContent}\n\nSvara användaren om vad du skapade.`;
      const response = await conversation.chat(prompt);

      setStatus('success');
      setMessage(response);

      // Try to extract task title from response for better UX
      const titleMatch = response.match(/['"]([^'"]+)['"]/);
      if (titleMatch) {
        setCreatedTaskTitle(titleMatch[1]);
      }

      // Auto-redirect to inbox after 3 seconds
      setTimeout(() => {
        navigate('/inbox');
      }, 3000);
    } catch (error) {
      console.error('Share handler error:', error);
      setStatus('error');
      setMessage('Kunde inte skapa task från delat innehåll');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--e-surface)',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--e-surface)',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        padding: '32px',
        maxWidth: '448px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center' }}>
          {status === 'processing' && (
            <>
              <span className="e-icons e-loader" style={{
                fontSize: '64px',
                color: 'var(--primary-500)',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
                display: 'block'
              }}></span>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--e-text)',
                marginBottom: '8px'
              }}>
                Skapar task
              </h2>
              <p style={{ color: 'var(--e-text)', opacity: 0.7 }}>{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <span className="e-icons e-check" style={{
                fontSize: '64px',
                color: '#10b981',
                margin: '0 auto 16px',
                display: 'block'
              }}></span>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--e-text)',
                marginBottom: '8px'
              }}>
                Task skapad!
              </h2>
              {createdTaskTitle && (
                <p style={{
                  fontSize: '18px',
                  fontWeight: '500',
                  color: 'var(--e-text)',
                  marginBottom: '12px'
                }}>
                  "{createdTaskTitle}"
                </p>
              )}
              <p style={{
                color: 'var(--e-text)',
                opacity: 0.7,
                marginBottom: '16px'
              }}>{message}</p>
              <p style={{
                fontSize: '14px',
                color: 'var(--e-text)',
                opacity: 0.6
              }}>
                Omdirigerar till inbox om 3 sekunder...
              </p>
              <div style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/inbox')}
                  style={{ width: '100%' }}
                >
                  Gå till Inbox nu
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate('/focus')}
                  style={{ width: '100%' }}
                >
                  Gå till Just Nu
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="e-icons e-alert" style={{
                fontSize: '64px',
                color: '#ef4444',
                margin: '0 auto 16px',
                display: 'block'
              }}></span>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--e-text)',
                marginBottom: '8px'
              }}>
                Något gick fel
              </h2>
              <p style={{
                color: 'var(--e-text)',
                opacity: 0.7,
                marginBottom: '16px'
              }}>{message}</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/focus')}
                style={{ width: '100%' }}
              >
                Tillbaka till appen
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
