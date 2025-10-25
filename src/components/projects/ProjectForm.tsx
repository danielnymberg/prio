import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/lib/types';
import toast from 'react-hot-toast';
import { PDFUpload } from './PDFUpload';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { TextBoxComponent, NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPDFUpload, setShowPDFUpload] = useState(false);
  const [extractedFromPDF, setExtractedFromPDF] = useState(false);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    client_name: '',
    quoted_hours: 0,
    hourly_rate: 0,
    external_costs: 0,
    start_date: '',
    project_deadline: '',
    color: '#6B7280'
  });

  const calculatedBudget = (formData.quoted_hours * formData.hourly_rate) + (formData.external_costs || 0);

  const handlePDFData = (data: any) => {
    setFormData({
      ...formData,
      name: data.name || formData.name,
      client_name: data.client_name || formData.client_name,
      quoted_hours: data.quoted_hours || formData.quoted_hours,
      hourly_rate: data.hourly_rate || formData.hourly_rate,
      external_costs: data.external_costs || formData.external_costs,
      project_deadline: data.project_deadline || formData.project_deadline,
      description: data.description || formData.description,
    });
    setExtractedFromPDF(true);
    toast.success('Data extraherad! Granska och justera om nödvändigt.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          ...formData,
          total_budget: calculatedBudget, // Beräkna och spara manuellt
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Projekt skapat!');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Kunde inte skapa projekt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* PDF Upload sektion */}
      <div className="e-mb-24">
        <div className="e-mb-16" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="e-text-lg e-font-semibold">
            Skapa från offert
          </h3>
          <button
            type="button"
            onClick={() => setShowPDFUpload(!showPDFUpload)}
            className="e-text-sm e-font-medium"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <span className="e-icons e-file" style={{ fontSize: '12px' }}></span>
            {showPDFUpload ? 'Dölj' : 'Ladda upp'} PDF
          </button>
        </div>

        {showPDFUpload && (
          <PDFUpload onExtractedData={handlePDFData} />
        )}

        {extractedFromPDF && (
          <div className="e-mt-16 e-p-16 e-rounded-xl">
            <p className="e-text-sm e-flex e-align-center e-gap-8">
              ✓ Data extraherad från PDF. Granska fälten nedan och justera vid behov.
            </p>
          </div>
        )}
      </div>

      <div className="e-border-t e-pt-24">
        <h3 className="e-text-lg e-font-semibold e-mb-16">
          Projektinformation
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
              Projektnamn *
            </label>
            <TextBoxComponent
              value={formData.name}
              change={(e: any) => setFormData({ ...formData, name: e.value })}
              cssClass="e-outline"
              placeholder="Ange projektnamn"
            />
          </div>

          <div>
            <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
              Klient/Beställare
            </label>
            <TextBoxComponent
              value={formData.client_name || ''}
              change={(e: any) => setFormData({ ...formData, client_name: e.value })}
              cssClass="e-outline"
              placeholder="Ange kund/beställare"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
                Offererade timmar *
              </label>
              <NumericTextBoxComponent
                value={formData.quoted_hours}
                change={(e: any) => setFormData({ ...formData, quoted_hours: e.value || 0 })}
                cssClass="e-outline"
                step={0.5}
                min={0}
                format="N1"
                showSpinButton={false}
              />
            </div>

            <div>
              <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
                Timpris (kr) *
              </label>
              <NumericTextBoxComponent
                value={formData.hourly_rate}
                change={(e: any) => setFormData({ ...formData, hourly_rate: e.value || 0 })}
                cssClass="e-outline"
                step={50}
                min={0}
                format="N0"
                showSpinButton={false}
              />
            </div>
          </div>

          <div>
            <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
              Övriga kostnader (resor, externa tjänster, kr)
            </label>
            <NumericTextBoxComponent
              value={formData.external_costs || 0}
              change={(e: any) => setFormData({ ...formData, external_costs: e.value || 0 })}
              cssClass="e-outline"
              step={100}
              min={0}
              format="N0"
              showSpinButton={false}
            />
          </div>

          <div className="e-p-16 e-rounded-lg">
            <div className="e-text-sm e-mb-4">
              Beräknad total budget
            </div>
            <div className="e-text-2xl e-font-bold">
              {calculatedBudget.toLocaleString('sv-SE')} kr
            </div>
            <div className="e-text-xs e-mt-4">
              {formData.quoted_hours}h × {formData.hourly_rate} kr/h
              {(formData.external_costs || 0) > 0 && ` + ${formData.external_costs} kr övriga`}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
                Startdatum
              </label>
              <DatePickerComponent
                value={formData.start_date ? new Date(formData.start_date) : undefined}
                change={(e: any) => setFormData({ ...formData, start_date: e.value ? e.value.toISOString().split('T')[0] : '' })}
                cssClass="e-outline"
                format="yyyy-MM-dd"
                placeholder="Välj startdatum"
              />
            </div>
            <div>
              <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
                Deadline
              </label>
              <DatePickerComponent
                value={formData.project_deadline ? new Date(formData.project_deadline) : undefined}
                change={(e: any) => setFormData({ ...formData, project_deadline: e.value ? e.value.toISOString().split('T')[0] : '' })}
                cssClass="e-outline"
                format="yyyy-MM-dd"
                placeholder="Välj deadline"
              />
            </div>
          </div>

          <div>
            <label className="e-text-sm e-font-medium e-mb-8" style={{ display: 'block' }}>
              Beskrivning
            </label>
            <TextBoxComponent
              value={formData.description || ''}
              change={(e: any) => setFormData({ ...formData, description: e.value })}
              cssClass="e-outline"
              multiline={true}
              placeholder="Beskriv projektet (valfritt)"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }} onClick={(e) => {
              e.preventDefault();
              if (!loading) {
                handleSubmit(e as any);
              }
            }}>
              <Button
                disabled={loading}
                variant="primary"
                loading={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Skapar...' : 'Skapa projekt'}
              </Button>
            </div>
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
              >
                Avbryt
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
