import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { SyncButton as Button } from '@/components/ui/SyncButton';
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
    <div className="e-flex e-flex-column e-gap-24 e-max-w-2xl e-mx-auto">
      <div>
        <h1 className="e-font-bold e-mb-8" style={{
          fontSize: 'clamp(24px, 5vw, 30px)',
          color: 'var(--e-text)'
        }}>
          Importera tasks
        </h1>
        <p className="e-opacity-75" style={{ color: 'var(--e-text)' }}>
          Importera tasks från JSON-format
        </p>
      </div>

      <div className="e-rounded-lg e-p-24 e-border" style={{
        backgroundColor: 'var(--e-surface)',
        borderColor: 'var(--e-border)'
      }}>
        <div className="e-flex e-align-center e-gap-16 e-mb-16">
          <label className="e-cursor-pointer e-inline-block">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="e-hidden"
            />
            <span className="e-inline-flex e-align-center e-gap-8 e-px-16 e-py-8 e-rounded-md e-font-medium e-cursor-pointer e-text-base" style={{
              backgroundColor: 'var(--e-border)',
              color: 'var(--e-text)'
            }}>
              <Upload style={{ width: '16px', height: '16px' }} />
              Välj JSON-fil
            </span>
          </label>

          <span className="e-text-sm e-opacity-75" style={{ color: 'var(--e-text)' }}>
            eller klistra in JSON nedan
          </span>
        </div>

        <div>
          <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
            JSON-data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={exampleJson}
            rows={15}
            className="e-w-full e-p-12 e-border e-rounded-md e-text-sm"
            style={{
              borderColor: 'var(--e-border)',
              backgroundColor: 'var(--e-surface)',
              color: 'var(--e-text)',
              fontFamily: 'monospace',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        <div className="e-flex e-gap-8 e-mt-16">
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || !jsonInput.trim()}
            className="e-flex-1"
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

      <div className="e-rounded-lg e-p-24 e-border" style={{
        backgroundColor: 'var(--e-surface)',
        borderColor: 'var(--e-border)'
      }}>
        <div className="e-flex e-align-start e-gap-12">
          <FileJson style={{
            width: '20px',
            height: '20px',
            color: 'var(--copper-500)',
            marginTop: '2px'
          }} />
          <div>
            <h3 className="e-font-semibold e-mb-8" style={{ color: 'var(--e-text)' }}>
              JSON-format
            </h3>
            <p className="e-text-sm e-opacity-75 e-mb-8" style={{ color: 'var(--e-text)' }}>
              JSON måste vara en array av tasks med följande fält:
            </p>
            <ul className="e-text-sm e-opacity-75 e-flex e-flex-column e-gap-4" style={{
              color: 'var(--e-text)',
              listStyleType: 'disc',
              listStylePosition: 'inside'
            }}>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>title</code> (required) - Titel på tasken</li>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>description</code> (optional) - Beskrivning</li>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>importance</code> (optional, 1-10) - Viktighet (default: 5)</li>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>urgency</code> (optional, 1-10) - Brådskande (default: 5)</li>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>deadline</code> (optional, YYYY-MM-DD) - Deadline</li>
              <li><code className="e-px-4 e-py-4 e-rounded" style={{ backgroundColor: 'var(--e-border)' }}>status</code> (optional) - not_started, in_progress, eller done</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
