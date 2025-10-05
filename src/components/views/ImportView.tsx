import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { Upload, FileJson } from 'lucide-react';

export function ImportView() {
  const { createTask } = useTasks();
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);

    try {
      const tasks = JSON.parse(jsonInput);

      if (!Array.isArray(tasks)) {
        throw new Error('JSON måste vara en array av tasks');
      }

      let successCount = 0;
      let errorCount = 0;

      for (const task of tasks) {
        try {
          await createTask({
            title: task.title || task.namn || 'Untitled',
            description: task.description || task.beskrivning || null,
            value_score: task.value_score || task.importance || task.viktighet || 5,
            time_sensitivity: task.time_sensitivity || task.urgency || task.brådskande || 5,
            confidence: task.confidence || 7,
            effort: task.effort || 5,
            deadline: task.deadline || task.deadline_datum || null,
            status: task.status || 'not_started',
          });
          successCount++;
        } catch (error) {
          console.error('Failed to import task:', task, error);
          errorCount++;
        }
      }

      toast.success(`Importerade ${successCount} tasks${errorCount > 0 ? ` (${errorCount} misslyckades)` : ''}!`);
      setJsonInput('');
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'Kunde inte importera tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  const exampleJson = `[
  {
    "title": "Exempel task 1",
    "description": "Detta är en beskrivning",
    "importance": 8,
    "urgency": 3,
    "deadline": "2025-10-15",
    "status": "not_started"
  },
  {
    "title": "Exempel task 2",
    "importance": 5,
    "urgency": 8
  }
]`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Importera tasks
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Importera tasks från JSON-format
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          <label className="cursor-pointer inline-block">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white focus:ring-gray-500 text-base cursor-pointer">
              <Upload className="h-4 w-4" />
              Välj JSON-fil
            </span>
          </label>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            eller klistra in JSON nedan
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            JSON-data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={exampleJson}
            rows={15}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm resize-none"
          />
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || !jsonInput.trim()}
            className="flex-1"
          >
            {loading ? 'Importerar...' : 'Importera tasks'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setJsonInput('')}
            disabled={loading || !jsonInput.trim()}
          >
            Rensa
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <FileJson className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              JSON-format
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              JSON måste vara en array av tasks med följande fält:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">title</code> (required) - Titel på tasken</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">description</code> (optional) - Beskrivning</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">importance</code> (optional, 1-10) - Viktighet (default: 5)</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">urgency</code> (optional, 1-10) - Brådskande (default: 5)</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">deadline</code> (optional, YYYY-MM-DD) - Deadline</li>
              <li><code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">status</code> (optional) - not_started, in_progress, eller done</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
