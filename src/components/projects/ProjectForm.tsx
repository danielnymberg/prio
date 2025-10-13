import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/lib/types';
import toast from 'react-hot-toast';
import { PDFUpload } from './PDFUpload';
import { FileText } from 'lucide-react';
import { SyncButton as Button } from '@/components/ui/SyncButton';

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
    <form onSubmit={handleSubmit} className="e-flex e-flex-column e-gap-24">
      {/* PDF Upload sektion */}
      <div className="e-mb-24">
        <div className="e-flex e-align-center e-justify-between e-mb-16">
          <h3 className="e-text-lg e-font-semibold" style={{ color: 'var(--e-text)' }}>
            Skapa från offert
          </h3>
          <button
            type="button"
            onClick={() => setShowPDFUpload(!showPDFUpload)}
            className="e-flex e-align-center e-gap-8 e-px-16 e-py-8 e-text-sm e-font-medium e-rounded-lg e-transition e-cursor-pointer"
            style={{
              color: '#f59e0b',
              backgroundColor: 'transparent',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FileText style={{ height: '16px', width: '16px' }} />
            {showPDFUpload ? 'Dölj' : 'Ladda upp'} PDF
          </button>
        </div>

        {showPDFUpload && (
          <PDFUpload onExtractedData={handlePDFData} />
        )}

        {extractedFromPDF && (
          <div className="e-mt-16 e-p-16 e-rounded-xl" style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid #10b981'
          }}>
            <p className="e-text-sm e-flex e-align-center e-gap-8" style={{ color: '#10b981' }}>
              ✓ Data extraherad från PDF. Granska fälten nedan och justera vid behov.
            </p>
          </div>
        )}
      </div>

      <div className="e-border-t e-pt-24">
        <h3 className="e-text-lg e-font-semibold e-mb-16" style={{ color: 'var(--e-text)' }}>
          Projektinformation
        </h3>

        <div className="e-flex e-flex-column e-gap-24">
          <div>
            <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
              Projektnamn *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
              style={{
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          <div>
            <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
              Klient/Beställare
            </label>
            <input
              type="text"
              value={formData.client_name || ''}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
              style={{
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="e-grid e-grid-cols-2 e-gap-16">
            <div>
              <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
                Offererade timmar *
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.quoted_hours}
                onChange={(e) => setFormData({ ...formData, quoted_hours: parseFloat(e.target.value) || 0 })}
                className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
                style={{
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-400)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--e-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <div>
              <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
                Timpris (kr) *
              </label>
              <input
                type="number"
                step="50"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
                style={{
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-400)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--e-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>
          </div>

          <div>
            <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
              Övriga kostnader (resor, externa tjänster, kr)
            </label>
            <input
              type="number"
              step="100"
              value={formData.external_costs || 0}
              onChange={(e) => setFormData({ ...formData, external_costs: parseFloat(e.target.value) || 0 })}
              className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
              style={{
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div className="e-p-16 e-rounded-lg" style={{ backgroundColor: 'var(--e-surface-hover)' }}>
            <div className="e-text-sm e-mb-4" style={{ color: 'var(--e-text-secondary)' }}>
              Beräknad total budget
            </div>
            <div className="e-text-2xl e-font-bold" style={{ color: 'var(--primary-600)' }}>
              {calculatedBudget.toLocaleString('sv-SE')} kr
            </div>
            <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>
              {formData.quoted_hours}h × {formData.hourly_rate} kr/h
              {(formData.external_costs || 0) > 0 && ` + ${formData.external_costs} kr övriga`}
            </div>
          </div>

          <div>
            <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
              Deadline
            </label>
            <input
              type="date"
              value={formData.project_deadline || ''}
              onChange={(e) => setFormData({ ...formData, project_deadline: e.target.value })}
              className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
              style={{
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label className="e-block e-text-sm e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
              Beskrivning
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="e-w-full e-px-16 e-py-8 e-border e-rounded-lg e-text-base e-transition"
              style={{
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                outline: 'none',
                resize: 'vertical',
                minHeight: '72px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              rows={3}
            />
          </div>

          <div className="e-flex e-gap-12">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="primary"
              loading={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Skapar...' : 'Skapa projekt'}
            </Button>
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
