import { useState } from 'react';
import { AllocationGrid } from './AllocationGrid';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DateRangePickerComponent } from '@syncfusion/ej2-react-calendars';

// Predefined periods
const periodOptions = [
  { text: 'Nästa 12 veckor', value: 'next_12_weeks' },
  { text: 'Nästa 26 veckor (6 mån)', value: 'next_26_weeks' },
  { text: 'Nästa 52 veckor (1 år)', value: 'next_52_weeks' },
  { text: 'Q4 2025', value: 'q4_2025' },
  { text: 'Q1 2026', value: 'q1_2026' },
  { text: 'Anpassad period...', value: 'custom' },
];

function getDateRange(period: string): { start: Date; end: Date } {
  const today = new Date();

  switch (period) {
    case 'next_12_weeks':
      return {
        start: today,
        end: new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000),
      };
    case 'next_26_weeks':
      return {
        start: today,
        end: new Date(today.getTime() + 26 * 7 * 24 * 60 * 60 * 1000),
      };
    case 'next_52_weeks':
      return {
        start: today,
        end: new Date(today.getTime() + 52 * 7 * 24 * 60 * 60 * 1000),
      };
    case 'q4_2025':
      return {
        start: new Date(2025, 9, 23), // 23 okt 2025
        end: new Date(2025, 11, 22),   // 22 dec 2025
      };
    case 'q1_2026':
      return {
        start: new Date(2026, 0, 2),   // 2 jan 2026
        end: new Date(2026, 2, 31),    // 31 mars 2026
      };
    default:
      return { start: today, end: new Date(today.getTime() + 12 * 7 * 24 * 60 * 60 * 1000) };
  }
}

export function ResursallokeringAllView() {
  const [selectedPeriod, setSelectedPeriod] = useState('next_12_weeks');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const isCustom = selectedPeriod === 'custom';
  const dateRange = isCustom && customStart && customEnd
    ? { start: customStart, end: customEnd }
    : getDateRange(selectedPeriod);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            Resursallokering
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>
            Planera timmar per projekt och vecka
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <DropDownListComponent
            dataSource={periodOptions}
            fields={{ text: 'text', value: 'value' }}
            value={selectedPeriod}
            change={(e: any) => setSelectedPeriod(e.value)}
            width="200px"
          />
          {isCustom && (
            <DateRangePickerComponent
              placeholder="Välj period"
              startDate={customStart || undefined}
              endDate={customEnd || undefined}
              change={(e: any) => {
                setCustomStart(e.startDate);
                setCustomEnd(e.endDate);
              }}
              width="250px"
            />
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        backgroundColor: '#eff6ff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="e-icons e-info" style={{ fontSize: '16px', color: '#3b82f6' }}></span>
          <div>
            <p style={{ fontWeight: 'bold', fontSize: '14px', margin: 0, color: '#1e40af' }}>
              Så här fungerar det:
            </p>
            <ul style={{ fontSize: '12px', margin: 0, marginTop: '4px', paddingLeft: '16px', color: '#1e3a8a' }}>
              <li>Klicka på en cell för att allokera timmar</li>
              <li>Grön = ok kapacitet, Orange = tight, Röd = överbelastad</li>
              <li>Dubbelklicka på projekt för att se detaljer</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Grid */}
      <AllocationGrid
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
    </>
  );
}
