import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';

interface SyncInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'number';
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}

export function SyncInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  disabled = false
}: SyncInputProps) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <TextBoxComponent
        placeholder={placeholder || label}
        value={value}
        change={(e: any) => onChange(e.value || '')}
        cssClass={error ? 'e-error' : ''}
        floatLabelType={label ? 'Auto' : 'Never'}
        type={type}
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
