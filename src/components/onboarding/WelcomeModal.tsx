import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Target, Zap, Brain, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void;
  onConnectMicrosoft?: () => Promise<void>;
  onSkip?: () => Promise<void>;
}

export function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleSkip} title="Välkommen till Prio" size="lg">
      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            style={{
              height: '8px',
              flex: 1,
              borderRadius: '4px',
              transition: 'all 0.3s',
              backgroundColor: s <= step ? 'var(--copper-600)' : 'var(--e-border)'
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: 'var(--e-text)' }}>
        Steg {step} av 4
      </div>

      {/* Steg 1: Välkommen & CPM-modellen */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎯</div>
            <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px' }}>
              Håll fokus på det som är viktigt
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--e-text)' }}>
              Prio hjälper dig prioritera smartare med CPM-modellen
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--e-surface)', border: '2px solid var(--e-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target style={{ height: '24px', width: '24px' }} />
              Vad är CPM-modellen?
            </h3>
            <p style={{ color: 'var(--e-text)', marginBottom: '16px' }}>
              <strong>Consequence-Priority Model</strong> är en forskningsbaserad metod som
              beräknar verklig prioritet baserat på faktiska konsekvenser - inte vad som känns brådskande.
            </p>
            <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px', fontFamily: 'monospace', fontSize: '14px' }}>
              Prioritet = (Värde × Tidskänslighet × Tillit) / Ansträngning
            </div>
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

      {/* Steg 2: CPM-parametrar */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              De fyra parametrarna
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              För varje uppgift bedömer du dessa fyra värden
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--e-success, #10b981)', opacity: 0.1, border: '1px solid var(--e-success, #10b981)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-success, #10b981)', marginBottom: '8px' }}>
                💎 Värde (Value)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-success, #10b981)' }}>
                Hur stora är de <strong>objektiva konsekvenserna</strong> om du gör/inte gör detta?
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--e-warning, #f59e0b)', opacity: 0.1, border: '1px solid var(--e-warning, #f59e0b)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-warning, #f59e0b)', marginBottom: '8px' }}>
                ⏱️ Tidskänslighet (Time-Sensitivity)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-warning, #f59e0b)' }}>
                Hur mycket <strong>kostar det att vänta</strong>? (Inte hur stressad du känner dig!)
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--e-surface)', border: '1px solid var(--e-border)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
                ✅ Tillit (Confidence)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                Hur <strong>säker är du</strong> på att detta ger resultat?
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--e-error, #ef4444)', opacity: 0.1, border: '1px solid var(--e-error, #ef4444)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-error, #ef4444)', marginBottom: '8px' }}>
                💪 Ansträngning (Effort)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-error, #ef4444)' }}>
                Hur mycket <strong>faktisk tid och energi</strong> krävs?
              </p>
            </div>
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

      {/* Steg 3: Konsekvenstänkande */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <AlertTriangle style={{ height: '64px', width: '64px', color: 'var(--e-warning, #f59e0b)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Motverka "Urgency Bias"
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Forskning visar att vi systematiskt övervärderar brådska
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--e-warning, #f59e0b)', opacity: 0.1, border: '2px solid var(--e-warning, #f59e0b)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-warning, #f59e0b)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Brain style={{ height: '24px', width: '24px' }} />
              Mere Urgency Effect
            </h3>
            <p style={{ color: 'var(--e-warning, #f59e0b)', marginBottom: '16px' }}>
              När vi är stressade väljer vi vad som <strong>känns brådskande</strong> istället
              för vad som faktiskt <strong>är viktigt</strong>.
            </p>
            <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600' }}>Därför frågar Prio:</p>
              <ul style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'disc', paddingLeft: '20px', color: 'var(--e-text)' }}>
                <li>Vad händer om 1 vecka om du INTE gör detta?</li>
                <li>Vad händer om 1 månad?</li>
                <li>Vad händer om 1 år?</li>
              </ul>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
              <strong>💡 Tips:</strong> Om konsekvenserna är minimala efter 1 månad,
              är uppgiften förmodligen inte lika brådskande som den känns just nu.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
              Tillbaka
            </Button>
            <Button onClick={() => setStep(4)} style={{ flex: 1 }}>
              Nästa <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 4: Kom igång */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircle style={{ height: '64px', width: '64px', color: 'var(--e-success, #10b981)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Du är redo!
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Så här kommer du igång med Prio
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--copper-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                1
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Gör din dagliga check-in
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Sätt din tillgängliga tid, energinivå och strategi för dagen
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--copper-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                2
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Lägg till dina uppgifter
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Använd "Ny task" och fyll i CPM-parametrarna
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', backgroundColor: 'var(--e-surface)', borderRadius: '8px' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--copper-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                3
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px' }}>
                  Gå till "Just Nu"
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Prio visar automatiskt den viktigaste uppgiften att börja med
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-surface), var(--e-surface))', borderRadius: '8px', padding: '16px', border: '1px solid var(--e-border)' }}>
            <p style={{ fontSize: '14px', textAlign: 'center', color: 'var(--e-text)' }}>
              <Zap style={{ display: 'inline', height: '16px', width: '16px', marginRight: '4px' }} />
              <strong>Pro-tips:</strong> Använd "Wizard"-läget för att skapa uppgifter med guidning!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>
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
