/**
 * TestView - Minimal SyncFusion Fluent2 referens
 *
 * Detta är en REFERENS-sida för korrekt SF Fluent2-användning.
 * Använd denna som mall för andra vyer.
 *
 * REGLER:
 * 1. INGA påhittade utility-klasser (e-p-24, e-mb-24 finns INTE)
 * 2. Använd INLINE STYLES för spacing
 * 3. Använd CSS-variabler från syncfusion-theme-variables.css
 * 4. SF Card-struktur: e-card, e-card-header, e-card-content
 * 5. ButtonComponent från SF
 */

import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

export function TestView() {
  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>

      {/* Header */}
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        Test View - SF Fluent2 Referens
      </h1>
      <p style={{ color: 'var(--e-text-secondary)', marginBottom: '32px' }}>
        Detta är en minimal sida med KORREKT SyncFusion Fluent2-användning.
      </p>

      {/* === 1. BASIC CARD === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Basic Card</div>
        </div>
        <div className="e-card-content">
          <p style={{ marginBottom: '16px' }}>
            Detta är ett Basic Card med SyncFusion e-card klasser.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>
            Använd inline styles för spacing, INTE e-p-24 eller liknande.
          </p>
        </div>
      </div>

      {/* === 2. CARD MED BUTTON === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Card med Button</div>
        </div>
        <div className="e-card-content">
          <p style={{ marginBottom: '16px' }}>
            Använd ButtonComponent från SyncFusion.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <ButtonComponent cssClass="e-primary">Primary Button</ButtonComponent>
            <ButtonComponent cssClass="e-outline">Outline Button</ButtonComponent>
            <ButtonComponent cssClass="e-flat">Flat Button</ButtonComponent>
          </div>
        </div>
      </div>

      {/* === 3. STATISTIK-KORT MED GRID === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Statistik med Grid Layout</div>
        </div>
        <div className="e-card-content">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '8px' }}>
                Total
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>42</div>
            </div>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-success)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '8px' }}>
                Success
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-success)' }}>28</div>
            </div>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-warning)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '8px' }}>
                Warning
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-warning)' }}>10</div>
            </div>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-error)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '8px' }}>
                Error
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-error)' }}>4</div>
            </div>
          </div>
        </div>
      </div>

      {/* === 4. VARNINGAR OCH ALERTS === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Varningar och Alerts</div>
        </div>
        <div className="e-card-content">

          {/* Success Alert */}
          <div style={{
            padding: '16px',
            marginBottom: '12px',
            backgroundColor: 'var(--e-success)',
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span className="e-icons e-check" style={{ fontSize: '20px' }}></span>
            <span>Success! Detta är ett success-meddelande.</span>
          </div>

          {/* Warning Alert */}
          <div style={{
            padding: '16px',
            marginBottom: '12px',
            backgroundColor: 'var(--e-warning)',
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span className="e-icons e-warning" style={{ fontSize: '20px' }}></span>
            <span>Varning! Detta är ett warning-meddelande.</span>
          </div>

          {/* Error Alert */}
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--e-error)',
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span className="e-icons e-close" style={{ fontSize: '20px' }}></span>
            <span>Error! Detta är ett error-meddelande.</span>
          </div>

        </div>
      </div>

      {/* === 5. IKONER === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">SyncFusion Ikoner</div>
        </div>
        <div className="e-card-content">
          <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--e-text-secondary)' }}>
            Använd e-icons klasser för ikoner.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span className="e-icons e-plus" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-check" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-close" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-warning" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-play" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-pause" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-time" style={{ fontSize: '24px' }}></span>
            <span className="e-icons e-schedule" style={{ fontSize: '24px' }}></span>
          </div>
        </div>
      </div>

      {/* === 6. CSS-VARIABLER === */}
      <div className="e-card">
        <div className="e-card-header">
          <div className="e-card-title">CSS-Variabler</div>
        </div>
        <div className="e-card-content">
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>
            Dessa CSS-variabler finns i syncfusion-theme-variables.css:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '24px', fontSize: '14px', lineHeight: '2' }}>
            <li><code>--e-surface</code> - Huvudyta</li>
            <li><code>--e-surface-alt</code> - Alternativ yta</li>
            <li><code>--e-surface-variant</code> - Variant yta</li>
            <li><code>--e-text-primary</code> - Primär text</li>
            <li><code>--e-text-secondary</code> - Sekundär text</li>
            <li><code>--e-border</code> - Border färg</li>
            <li><code>--e-success</code> - Success färg</li>
            <li><code>--e-warning</code> - Warning färg</li>
            <li><code>--e-error</code> - Error färg</li>
            <li><code>--e-primary</code> - Primary färg</li>
          </ul>
        </div>
      </div>

    </div>
  );
}
