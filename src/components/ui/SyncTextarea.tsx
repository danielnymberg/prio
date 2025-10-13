import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';

interface SyncTextareaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  autoFocus?: boolean;
}

export function SyncTextarea({
  label,
  value,
  onChange,
  error,
  placeholder,
  disabled = false
}: SyncTextareaProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <TextBoxComponent
        placeholder={placeholder || label}
        value={value}
        change={(e: any) => onChange(e.value || '')}
        cssClass={error ? 'e-error' : ''}
        floatLabelType={label ? 'Auto' : 'Never'}
        multiline={true}
        enabled={!disabled}
        readonly={disabled}
      />
      {error && (
        <div style={{
          color: '#dc2626',
          fontSize: '14px',
          marginTop: '4px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
