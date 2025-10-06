import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { ClaudeConversation } from '@/services/claude-conversation';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

      // Create conversation with Claude
      const conversation = new ClaudeConversation(
        {
          tasks,
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'processing' && (
            <>
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Skapar task
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Task skapad!
              </h2>
              {createdTaskTitle && (
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                  "{createdTaskTitle}"
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Omdirigerar till inbox om 3 sekunder...
              </p>
              <div className="mt-4 space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/inbox')}
                  className="w-full"
                >
                  Gå till Inbox nu
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => navigate('/focus')}
                  className="w-full"
                >
                  Gå till Just Nu
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Något gick fel
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/focus')}
                className="w-full"
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
