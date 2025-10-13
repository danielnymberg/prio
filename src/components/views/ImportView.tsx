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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '896px',
      margin: '0 auto'
    }}>
      <div>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 30px)',
          fontWeight: 'bold',
          color: 'var(--e-text)',
          marginBottom: '8px'
        }}>
          Importera tasks
        </h1>
        <p style={{ color: 'var(--e-text)', opacity: 0.7 }}>
          Importera tasks från JSON-format
        </p>
      </div>

      <div style={{
        background: 'var(--e-surface)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--e-border)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <label style={{ cursor: 'pointer', display: 'inline-block' }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '500',
              background: 'var(--e-border)',
              color: 'var(--e-text)',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              <Upload style={{ width: '16px', height: '16px' }} />
              Välj JSON-fil
            </span>
          </label>

          <span style={{
            fontSize: '14px',
            color: 'var(--e-text)',
            opacity: 0.7
          }}>
            eller klistra in JSON nedan
          </span>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--e-text)',
            marginBottom: '8px'
          }}>
            JSON-data
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={exampleJson}
            rows={15}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--e-border)',
              borderRadius: '8px',
              background: 'var(--e-surface)',
              color: 'var(--e-text)',
              fontFamily: 'monospace',
              fontSize: '14px',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px'
        }}>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={loading || !jsonInput.trim()}
            style={{ flex: 1 }}
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

      <div style={{
        background: 'var(--e-surface)',
        border: '1px solid var(--e-border)',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <FileJson style={{
            width: '20px',
            height: '20px',
            color: 'var(--copper-500)',
            marginTop: '2px'
          }} />
          <div>
            <h3 style={{
              fontWeight: '600',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              JSON-format
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--e-text)',
              opacity: 0.8,
              marginBottom: '8px'
            }}>
              JSON måste vara en array av tasks med följande fält:
            </p>
            <ul style={{
              fontSize: '14px',
              color: 'var(--e-text)',
              opacity: 0.8,
              listStyleType: 'disc',
              listStylePosition: 'inside',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>title</code> (required) - Titel på tasken</li>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>description</code> (optional) - Beskrivning</li>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>importance</code> (optional, 1-10) - Viktighet (default: 5)</li>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>urgency</code> (optional, 1-10) - Brådskande (default: 5)</li>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>deadline</code> (optional, YYYY-MM-DD) - Deadline</li>
              <li><code style={{ background: 'var(--e-border)', padding: '2px 4px', borderRadius: '4px' }}>status</code> (optional) - not_started, in_progress, eller done</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
