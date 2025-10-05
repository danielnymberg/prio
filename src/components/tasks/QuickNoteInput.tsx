import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Zap, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';

export function QuickNoteInput() {
  const [note, setNote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { createTask } = useTasks();

  const handleQuickAdd = async () => {
    if (!note.trim()) return;

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
      console.error('Quick note error:', error);
      toast.error('Kunde inte lägga till anteckning');
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-2xl transition-all active:scale-95 min-h-[56px] min-w-[56px] flex items-center justify-center"
        title="Snabb anteckning (ersätter röst tillsvidare)"
        aria-label="Öppna snabb anteckning"
      >
        <Zap className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-4 w-80 max-w-[calc(100vw-3rem)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Snabb anteckning
        </h3>
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

      <div className="space-y-3">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Vad vill du komma ihåg?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleQuickAdd();
            }
            if (e.key === 'Escape') {
              setNote('');
              setIsExpanded(false);
            }
          }}
          autoFocus
          className="w-full"
        />

        <div className="flex gap-2">
          <Button
            onClick={handleQuickAdd}
            disabled={!note.trim()}
            className="flex-1"
            size="md"
          >
            <Plus className="h-4 w-4 mr-1" />
            Lägg till
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
        💡 Tryck Enter för att lägga till, Esc för att avbryta. Hamnar i inbox för senare bedömning.
      </p>
    </div>
  );
}
