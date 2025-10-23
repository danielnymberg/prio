import { useNavigate } from 'react-router-dom';
import { ProjectForm } from '@/components/projects/ProjectForm';

export function NewProjectPage() {
  const navigate = useNavigate();

  return (
    <div className="e-mx-auto e-p-24" style={{ maxWidth: '896px' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/projects')}
        className="e-flex e-align-center e-gap-8 e-mb-24 e-p-0 e-text-base e-transition-colors e-cursor-pointer"
        style={{
          color: 'var(--e-text-secondary)',
          background: 'none',
          border: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--e-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--e-text-secondary)'}
      >
        <span className="e-icons e-arrow-left" style={{ fontSize: '16px' }}></span>
        Tillbaka till projekt
      </button>

      <h1 className="e-text-2xl e-font-bold e-mb-24">
        Skapa nytt projekt
      </h1>

      <ProjectForm
        onSuccess={() => navigate('/projects')}
        onCancel={() => navigate('/projects')}
      />
    </div>
  );
}
