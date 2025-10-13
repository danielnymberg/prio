import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { KanbanSquare, Calendar, Undo2, FolderKanban, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

interface KanbanOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function KanbanOnboarding({ isOpen, onComplete }: KanbanOnboardingProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_kanban_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_kanban_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleSkip} title="✨ Nya kraftfulla funktioner!" size="lg">
      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              height: '8px',
              flex: 1,
              borderRadius: '4px',
              transition: 'all 0.3s',
              backgroundColor: s <= step ? 'var(--primary-600)' : 'var(--e-border)'
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: 'var(--e-text)' }}>
        Steg {step} av 3
      </div>

      {/* Steg 1: Kanban Board */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px' }}>
              Kanban Board
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--e-text)' }}>
              Visualisera ditt arbetsflöde och dra tasks mellan status
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--e-surface)', border: '2px solid var(--e-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KanbanSquare style={{ height: '24px', width: '24px' }} />
              Vad är Kanban?
            </h3>
            <p style={{ color: 'var(--e-text)', marginBottom: '16px' }}>
              En visuell metod för att hantera arbete. Se alla dina uppgifter i tre kolumner:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>📋</span>
                <div>
                  <strong>Ej påbörjad</strong> - Tasks som väntar
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚀</span>
                <div>
                  <strong>Pågående</strong> - Det du jobbar på nu
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <div>
                  <strong>Klar</strong> - Färdiga uppgifter
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-info, #3b82f6), var(--e-info, #3b82f6))', opacity: 0.1, borderRadius: '8px', padding: '16px', border: '1px solid var(--e-info, #3b82f6)' }}>
            <p style={{ fontSize: '14px', color: 'var(--e-info, #3b82f6)' }}>
              <FolderKanban style={{ display: 'inline', height: '16px', width: '16px', marginRight: '4px' }} />
              <strong>Swimlanes för projekt:</strong> Tasks grupperas automatiskt per projekt så du ser strukturen tydligt!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={handleSkip} style={{ flex: 1 }}>
              Hoppa över
            </Button>
            <Button onClick={() => setStep(2)} style={{ flex: 1 }}>
              Nästa <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 2: Drag-and-Drop till Kalender */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🗓️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Drag-and-Drop Schemaläggning
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Dra tasks direkt från Kanban till kalendern
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--e-success, #10b981)', opacity: 0.1, border: '1px solid var(--e-success, #10b981)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-success, #10b981)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar style={{ height: '20px', width: '20px' }} />
                Kanban + Kalender
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-success, #10b981)', marginBottom: '12px' }}>
                Den nya kombinerade vyn visar Kanban och kalender sida vid sida. Dra tasks till en kalendercell för att schemalägga när du ska jobba på dem!
              </p>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                <strong>📍 Hitta den här:</strong> Sidebar → Avancerat → "Kanban + Kalender"
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--e-warning, #f59e0b)', opacity: 0.1, border: '1px solid var(--e-warning, #f59e0b)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-warning, #f59e0b)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Undo2 style={{ height: '20px', width: '20px' }} />
                Ångra-funktion
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-warning, #f59e0b)' }}>
                När du schemalägger en task visas en notifikation med "Ångra"-knapp. Du har 5 sekunder på dig att ändra dig!
              </p>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
              <strong>💡 Tips:</strong> Du kan också dra tasks mellan projekt genom att dra dem mellan swimlanes i Kanban-vyn!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
              Tillbaka
            </Button>
            <Button onClick={() => setStep(3)} style={{ flex: 1 }}>
              Nästa <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 3: Kom igång */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircle style={{ height: '64px', width: '64px', color: 'var(--e-success, #10b981)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Prova de nya funktionerna!
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Här är snabbguiden för att komma igång
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--primary-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                1
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Öppna Kanban-vyn
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Gå till Sidebar → "Kanban" för standalone-vy eller "Kanban + Kalender" för kombinerad vy
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--primary-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                2
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Dra och släpp
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Dra tasks mellan kolumner för att ändra status, eller till kalendern för att schemalägga
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--primary-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                3
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Klicka för detaljer
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Klicka på en task i Kanban för att öppna detaljvyn och redigera alla fält
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-primary, #9333ea), var(--e-accent, #ec4899))', opacity: 0.1, borderRadius: '8px', padding: '16px', border: '1px solid var(--e-primary, #9333ea)' }}>
            <p style={{ fontSize: '14px', textAlign: 'center', color: 'var(--e-primary, #9333ea)' }}>
              <Sparkles style={{ display: 'inline', height: '16px', width: '16px', marginRight: '4px' }} />
              <strong>Byggt med Syncfusion:</strong> Professionella UI-komponenter för bästa möjliga UX!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
              Tillbaka
            </Button>
            <Button onClick={handleComplete} style={{ flex: 1 }}>
              <CheckCircle style={{ height: '16px', width: '16px', marginRight: '8px' }} />
              Kom igång!
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
