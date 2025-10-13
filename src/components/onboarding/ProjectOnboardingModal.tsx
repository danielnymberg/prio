import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { FolderKanban, Sparkles, Calculator, TrendingUp, FileText, ArrowRight, CheckCircle } from 'lucide-react';

interface ProjectOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function ProjectOnboardingModal({ isOpen, onComplete }: ProjectOnboardingModalProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_project_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_project_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleSkip} title="Välkommen till Projekthantering" size="lg">
      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div
            key={s}
            style={{
              height: '8px',
              flex: 1,
              borderRadius: '4px',
              transition: 'all 0.3s',
              backgroundColor: s <= step ? 'var(--warning-500)' : 'var(--e-border)'
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: 'var(--e-text)' }}>
        Steg {step} av 5
      </div>

      {/* Steg 1: Vad är projekthantering? */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>💼</div>
            <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px' }}>
              Hantera kundprojekt med ekonomi
            </h2>
            <p style={{ fontSize: '18px', color: 'var(--e-text)' }}>
              Håll koll på budget, timmar och leveranser
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--e-surface)', border: '2px solid var(--e-border)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderKanban style={{ height: '24px', width: '24px' }} />
              Vad kan du göra?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--e-text)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle style={{ height: '20px', width: '20px', flexShrink: 0, marginTop: '2px' }} />
                <p>Skapa projekt med <strong>offererade timmar</strong> och <strong>timpris</strong></p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle style={{ height: '20px', width: '20px', flexShrink: 0, marginTop: '2px' }} />
                <p>Se <strong>auto-beräknad total budget</strong> (timmar × pris + övriga kostnader)</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle style={{ height: '20px', width: '20px', flexShrink: 0, marginTop: '2px' }} />
                <p>Spåra <strong>completion %</strong> och få budget-varningar</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <CheckCircle style={{ height: '20px', width: '20px', flexShrink: 0, marginTop: '2px' }} />
                <p>Koppla tasks till projekt för <strong>automatisk tidsspårning</strong></p>
              </div>
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

      {/* Steg 2: AI-driven skapande */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Sparkles style={{ height: '64px', width: '64px', color: 'var(--e-primary, #9333ea)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              AI-driven projektinmatning
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Skapa projekt super snabbt med naturligt språk
            </p>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-primary, #9333ea), var(--primary-100))', opacity: 0.1, border: '2px solid var(--e-primary, #9333ea)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-primary, #9333ea)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ height: '24px', width: '24px' }} />
              Så här fungerar det:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--e-text)', marginBottom: '8px' }}>Du säger:</p>
                <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '4px', padding: '12px', fontWeight: '500', color: 'var(--e-text)' }}>
                  "Nytt projekt Wallenstam slutrapport, 40 timmar, 1950 per timme, 2000 i resor, deadline 1 december"
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight style={{ height: '24px', width: '24px', color: '#9333ea' }} />
              </div>

              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '8px', padding: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--e-text)', marginBottom: '8px' }}>Claude skapar automatiskt:</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', color: 'var(--e-text)' }}>
                  <li>✅ Projektnamn: "Wallenstam slutrapport"</li>
                  <li>✅ Klient: "Wallenstam"</li>
                  <li>✅ Offererade timmar: 40h</li>
                  <li>✅ Timpris: 1 950 kr/h</li>
                  <li>✅ Övriga kostnader: 2 000 kr</li>
                  <li>✅ Total budget: <strong>80 000 kr</strong></li>
                  <li>✅ Deadline: 1 december 2025</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--e-warning, var(--warning-500))', opacity: 0.1, borderRadius: '8px', padding: '16px', border: '1px solid var(--e-warning, var(--warning-500))' }}>
            <p style={{ fontSize: '14px', color: 'var(--e-warning, var(--warning-500))' }}>
              <strong>💡 Tips:</strong> Använd AI-chatten (högst ner till höger) eller röstkommando
              för att skapa projekt blixtnabbt!
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

      {/* Steg 3: Budget & Ekonomi */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Calculator style={{ height: '64px', width: '64px', color: 'var(--e-success, #10b981)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Auto-beräknad ekonomi
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Håll koll på budget och lönsamhet i realtid
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--e-success, #10b981)', opacity: 0.1, border: '1px solid var(--e-success, #10b981)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-success, #10b981)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator style={{ height: '20px', width: '20px' }} />
                Total Budget
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-success, #10b981)', marginBottom: '8px' }}>
                Beräknas automatiskt när du skapar projekt:
              </p>
              <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '4px', padding: '12px', fontFamily: 'monospace', fontSize: '14px' }}>
                Budget = (Timmar × Timpris) + Övriga kostnader
              </div>
              <p style={{ fontSize: '12px', color: 'var(--e-success, #10b981)', marginTop: '8px' }}>
                Exempel: (40h × 1 950 kr/h) + 2 000 kr = <strong>80 000 kr</strong>
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--e-surface)', border: '1px solid var(--e-border)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ height: '20px', width: '20px' }} />
                Completion % (kommer i Fas 2)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                Du kommer kunna sätta completion % med reglage och få:
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--e-text)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'disc', paddingLeft: '20px' }}>
                <li>Återstående timmar att fakturera</li>
                <li>Förbrukad budget hittills</li>
                <li>Varningar om du går över budget</li>
              </ul>
            </div>

            <div style={{ backgroundColor: 'var(--e-primary, #9333ea)', opacity: 0.1, border: '1px solid var(--e-primary, #9333ea)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 'bold', color: 'var(--e-primary, #9333ea)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ height: '20px', width: '20px' }} />
                PDF-upload (tillgängligt nu!)
              </h4>
              <p style={{ fontSize: '14px', color: 'var(--e-primary, #9333ea)' }}>
                Dra in en PDF-offert så extraherar Claude automatiskt:
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--e-primary, #9333ea)', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'disc', paddingLeft: '20px' }}>
                <li>Projektnamn från offertens titel</li>
                <li>Kund från mottagare</li>
                <li>Timmar och timpris från prislista</li>
                <li>Externa kostnader från specifikation</li>
              </ul>
            </div>
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

      {/* Steg 4: PDF-upload NYTT! */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <FileText style={{ height: '64px', width: '64px', color: 'var(--e-warning, var(--warning-500))', margin: '0 auto 16px' }} />
              <Sparkles style={{ height: '32px', width: '32px', color: 'var(--e-primary, #9333ea)', position: 'absolute', top: '-8px', right: '-8px', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              AI PDF-upload är här! 🎉
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Skapa projekt från offert-PDF på 15 sekunder
            </p>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-warning, var(--warning-500)), var(--e-warning-dark, #f97316))', opacity: 0.1, border: '2px solid var(--e-warning, var(--warning-500))', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-warning, var(--warning-500))', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ height: '24px', width: '24px' }} />
              Så här funkar det:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-warning, var(--warning-500))', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  1
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-warning, var(--warning-500))' }}>
                    Gå till "Nytt projekt"
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--e-warning, var(--warning-500))' }}>
                    Klicka på knappen "Ladda upp PDF"
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-warning, var(--warning-500))', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  2
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-warning, var(--warning-500))' }}>
                    Dra och släpp din offert-PDF
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--e-warning, var(--warning-500))' }}>
                    Eller klicka för att välja fil
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-warning, var(--warning-500))', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  3
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-warning, var(--warning-500))' }}>
                    Vänta 5-15 sekunder medan Claude analyserar
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--e-warning, var(--warning-500))' }}>
                    AI läser och extraherar all viktig info
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-warning, var(--warning-500))', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  4
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-warning, var(--warning-500))' }}>
                    Granska och justera data om nödvändigt
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--e-warning, var(--warning-500))' }}>
                    Formuläret fylls i automatiskt
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-success, #10b981)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  ✓
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-success, #10b981)' }}>
                    Klicka "Skapa projekt" - klart!
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--e-success, #10b981)' }}>
                    Budget beräknas automatiskt
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--e-primary, #9333ea)', opacity: 0.1, borderRadius: '8px', padding: '16px', border: '1px solid var(--e-primary, #9333ea)' }}>
            <h4 style={{ fontWeight: 'bold', color: 'var(--e-primary, #9333ea)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ height: '20px', width: '20px' }} />
              Vad extraheras automatiskt?
            </h4>
            <ul style={{ fontSize: '14px', color: 'var(--e-primary, #9333ea)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>✅ Projektnamn (från offertens titel)</li>
              <li>✅ Kundnamn (från mottagare/beställare)</li>
              <li>✅ Offererade timmar (summerar olika poster)</li>
              <li>✅ Timpris (från prislista)</li>
              <li>✅ Externa kostnader (resor, material, licenser)</li>
              <li>✅ Deadline (från leveransdatum)</li>
              <li>✅ Beskrivning (sammanfattning av projektet)</li>
            </ul>
          </div>

          <div style={{ backgroundColor: 'var(--e-warning, var(--warning-500))', opacity: 0.1, borderRadius: '8px', padding: '16px', border: '1px solid var(--e-warning, var(--warning-500))' }}>
            <p style={{ fontSize: '14px', color: 'var(--e-warning, var(--warning-500))' }}>
              <strong>💡 Tips:</strong> Fungerar bäst med strukturerade offerter som har tydliga rubriker
              och prisuppställning. Om något blir fel kan du enkelt justera manuellt!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(3)} style={{ flex: 1 }}>
              Tillbaka
            </Button>
            <Button onClick={() => setStep(5)} style={{ flex: 1 }}>
              Nästa <ArrowRight style={{ height: '16px', width: '16px', marginLeft: '8px' }} />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 5: Kom igång */}
      {step === 5 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircle style={{ height: '64px', width: '64px', color: 'var(--e-success, #10b981)', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '8px' }}>
              Redo att skapa ditt första projekt!
            </h2>
            <p style={{ color: 'var(--e-text)' }}>
              Tre sätt att komma igång
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'linear-gradient(to right, var(--e-warning, var(--warning-500)), var(--e-warning-dark, #f97316))', opacity: 0.1, borderRadius: '8px', border: '2px solid var(--e-warning, var(--warning-500))' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-warning, var(--warning-500))', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                1
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ height: '16px', width: '16px' }} />
                  PDF-upload (rekommenderat! ⚡)
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Dra in en offert-PDF så extraherar Claude all info på 15 sekunder
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'linear-gradient(to right, var(--e-primary, #9333ea), var(--e-accent, #ec4899))', opacity: 0.1, borderRadius: '8px', border: '2px solid var(--e-primary, #9333ea)' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--e-primary, #9333ea)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                2
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles style={{ height: '16px', width: '16px' }} />
                  AI-chat
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Öppna chatten (högst ner till höger) och skriv:<br />
                  <code style={{ fontSize: '12px', backgroundColor: 'var(--e-surface)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                    "Nytt projekt för [Kund], [X] timmar, [Y] kr/h"
                  </code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'linear-gradient(to right, var(--e-surface), var(--e-surface))', borderRadius: '8px', border: '2px solid var(--e-border)' }}>
              <div style={{ flexShrink: 0, width: '32px', height: '32px', backgroundColor: 'var(--primary-600)', color: 'var(--e-surface, white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                3
              </div>
              <div>
                <h4 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderKanban style={{ height: '16px', width: '16px' }} />
                  Manuellt formulär
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                  Klicka på <strong>"Nytt projekt"</strong> och fyll i formuläret
                </p>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(to right, var(--e-surface), var(--e-surface))', borderRadius: '8px', padding: '16px', border: '1px solid var(--e-border)' }}>
            <p style={{ fontSize: '14px', textAlign: 'center', color: 'var(--e-text)' }}>
              <strong>🎯 Nu kör vi!</strong> Skapa ditt första projekt och testa funktionerna.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setStep(4)} style={{ flex: 1 }}>
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
