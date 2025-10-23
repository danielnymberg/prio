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
      <div className="e-mb-16 e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4">
            Resursallokering
          </h1>
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            Planera timmar per projekt och vecka
          </p>
        </div>
        <div className="e-flex e-gap-8 e-align-center">
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
      <div className="e-mb-16 e-p-12 e-border e-rounded-lg" style={{
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6'
      }}>
        <div className="e-flex e-align-center e-gap-8">
          <span className="e-icons e-info" style={{ fontSize: '16px', color: '#3b82f6' }}></span>
          <div>
            <p className="e-font-bold e-text-sm e-m-0" style={{ color: '#1e40af' }}>
              Så här fungerar det:
            </p>
            <ul className="e-text-xs e-m-0 e-mt-4 e-pl-16" style={{ color: '#1e3a8a' }}>
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
