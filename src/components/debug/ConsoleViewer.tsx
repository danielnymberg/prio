/**
 * ConsoleViewer - Live debug console för mobil-felsökning
 *
 * Fångar console.log, console.error, console.warn och visar i UI.
 * Toggle via Settings, kan minimeras/maximeras, export logs.
 */

import { useState, useEffect, useRef } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface LogEntry {
  timestamp: string;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
}

export function ConsoleViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('prio-debug-console') === 'true';
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Intercept console methods
  useEffect(() => {
    if (!isEnabled) return;

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const addLog = (type: LogEntry['type'], args: any[]) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      const entry: LogEntry = {
        timestamp: new Date().toISOString().split('T')[1].split('.')[0], // HH:MM:SS
        type,
        message,
      };

      setLogs(prev => [...prev.slice(-99), entry]); // Keep last 100 logs
    };

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog('log', args);
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog('error', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog('warn', args);
    };

    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, [isEnabled]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isMinimized) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isMinimized]);

  // Toggle från localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setIsEnabled(localStorage.getItem('prio-debug-console') === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isEnabled) return null;

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logsText = logs.map(log => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`).join('\n');
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prio-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      backgroundColor: '#1f2937',
      color: '#e5e7eb',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: isMinimized ? '40px' : '300px',
      transition: 'max-height 0.2s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#111827',
        borderBottom: isMinimized ? 'none' : '1px solid #374151'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>
          🐛 Debug Console ({logs.length})
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ButtonComponent
            cssClass="e-flat e-small"
            iconCss="e-icons e-close"
            onClick={clearLogs}
            style={{ color: '#9ca3af' } as any}
          />
          <ButtonComponent
            cssClass="e-flat e-small"
            iconCss="e-icons e-download"
            onClick={exportLogs}
            style={{ color: '#9ca3af' } as any}
          />
          <ButtonComponent
            cssClass="e-flat e-small"
            iconCss={isMinimized ? 'e-icons e-chevron-up' : 'e-icons e-chevron-down'}
            onClick={() => setIsMinimized(!isMinimized)}
            style={{ color: '#9ca3af' } as any}
          />
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
              Inga loggar än...
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{
                marginBottom: '4px',
                padding: '4px',
                borderLeft: `2px solid ${getLogColor(log.type)}`,
                paddingLeft: '8px'
              }}>
                <span style={{ color: '#9ca3af', marginRight: '8px' }}>
                  {log.timestamp}
                </span>
                <span style={{ color: getLogColor(log.type), marginRight: '8px', fontWeight: 600 }}>
                  [{log.type.toUpperCase()}]
                </span>
                <span style={{ wordBreak: 'break-word' }}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}
