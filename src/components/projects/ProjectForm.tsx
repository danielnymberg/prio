import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/lib/types';
import toast from 'react-hot-toast';
import { PDFUpload } from './PDFUpload';
import { FileText } from 'lucide-react';

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* PDF Upload sektion */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--e-text)'
          }}>Skapa från offert</h3>
          <button
            type="button"
            onClick={() => setShowPDFUpload(!showPDFUpload)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#f59e0b',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
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
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid #10b981',
            borderRadius: '12px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ✓ Data extraherad från PDF. Granska fälten nedan och justera vid behov.
            </p>
          </div>
        )}
      </div>

      <div style={{
        borderTop: '1px solid var(--e-border)',
        paddingTop: '24px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '16px',
          color: 'var(--e-text)'
        }}>Projektinformation</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              Projektnamn *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: '1px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--copper-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              Klient/Beställare
            </label>
            <input
              type="text"
              value={formData.client_name || ''}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: '1px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--copper-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--e-text)',
                marginBottom: '8px'
              }}>
                Offererade timmar *
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.quoted_hours}
                onChange={(e) => setFormData({ ...formData, quoted_hours: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: '1px solid var(--e-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--copper-400)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--e-border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--e-text)',
                marginBottom: '8px'
              }}>
                Timpris (kr) *
              </label>
              <input
                type="number"
                step="50"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  border: '1px solid var(--e-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--copper-400)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
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
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              Övriga kostnader (resor, externa tjänster, kr)
            </label>
            <input
              type="number"
              step="100"
              value={formData.external_costs || 0}
              onChange={(e) => setFormData({ ...formData, external_costs: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: '1px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--copper-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: 'var(--e-surface-hover)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '14px',
              color: 'var(--e-text-secondary)',
              marginBottom: '4px'
            }}>
              Beräknad total budget
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'var(--copper-600)'
            }}>
              {calculatedBudget.toLocaleString('sv-SE')} kr
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--e-text-secondary)',
              marginTop: '4px'
            }}>
              {formData.quoted_hours}h × {formData.hourly_rate} kr/h
              {(formData.external_costs || 0) > 0 && ` + ${formData.external_costs} kr övriga`}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              Deadline
            </label>
            <input
              type="date"
              value={formData.project_deadline || ''}
              onChange={(e) => setFormData({ ...formData, project_deadline: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: '1px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--copper-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)',
              marginBottom: '8px'
            }}>
              Beskrivning
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 16px',
                border: '1px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '72px',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--copper-400)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--copper-400)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'var(--copper-600)',
                color: '#ffffff',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--copper-700)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--copper-600)')}
            >
              {loading ? 'Skapar...' : 'Skapa projekt'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '12px 24px',
                  border: '1px solid var(--e-border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface)'}
              >
                Avbryt
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
