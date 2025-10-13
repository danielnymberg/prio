import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Calendar, Clock, X, Layers } from 'lucide-react';
import { FreeTimeSlot, blockCalendarTime, planWorkSessions, blockMultipleSessions, SessionPlan } from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';

interface AutoBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  durationMinutes: number;
  freeSlots: FreeTimeSlot[];
  deadline?: Date; // Add deadline for multi-session planning
}

export function AutoBookModal({
  isOpen,
  onClose,
  taskTitle,
  durationMinutes,
  freeSlots,
  deadline,
}: AutoBookModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<FreeTimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [maxSessionHours, setMaxSessionHours] = useState<number>(4); // Default 4h per session
  const [useMultipleSessions, setUseMultipleSessions] = useState(false);

  // Determine if we should use multi-session mode (for tasks > 8 hours)
  const shouldUseMultiSession = durationMinutes > 480; // > 8 hours

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSlot(null);
      setSessionPlan(null);
      setUseMultipleSessions(shouldUseMultiSession);
    }
  }, [isOpen, shouldUseMultiSession]);

  // Plan sessions when multi-session mode is active
  useEffect(() => {
    const planSessions = async () => {
      if (isOpen && useMultipleSessions && deadline) {
        const plan = await planWorkSessions(durationMinutes, deadline, maxSessionHours * 60);
        setSessionPlan(plan);
      }
    };
    planSessions();
  }, [isOpen, useMultipleSessions, durationMinutes, deadline, maxSessionHours]);

  const handleBook = async () => {
    setIsBooking(true);

    try {
      if (useMultipleSessions && sessionPlan) {
        // Book multiple sessions
        const result = await blockMultipleSessions(sessionPlan.sessions, taskTitle);

        if (result.success) {
          toast.success(`🗓️ ${result.bookedCount} sessioner bokade i kalendern!`);
          onClose();
        } else if (result.bookedCount > 0) {
          toast.success(`⚠️ ${result.bookedCount} av ${sessionPlan.sessions.length} sessioner bokade`);
          onClose();
        } else {
          toast.error('Kunde inte boka sessionerna');
        }
      } else if (selectedSlot) {
        // Book single session
        const success = await blockCalendarTime(
          selectedSlot.start,
          durationMinutes,
          taskTitle
        );

        if (success) {
          toast.success('🗓️ Tid blockerad i kalendern!');
          onClose();
        } else {
          toast.error('Kunde inte boka i kalendern');
        }
      }
    } catch (error) {
      console.error('Auto-booking error:', error);
      toast.error('Fel vid bokning');
    } finally {
      setIsBooking(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Idag';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Imorgon';
    } else {
      return date.toLocaleDateString('sv-SE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  };

  // Show top 3 slots
  const topSlots = freeSlots.slice(0, 3);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={useMultipleSessions ? "📅 Planera projekt-sessioner" : "📅 Boka tid automatiskt"}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Task info header */}
        <div style={{
          backgroundColor: 'var(--e-surface)',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <Calendar style={{
              height: '20px',
              width: '20px',
              color: 'var(--primary-600)',
              flexShrink: 0,
              marginTop: '2px'
            }} />
            <div style={{ flex: '1' }}>
              <h3 style={{
                fontWeight: '600',
                color: 'var(--e-text)',
                marginBottom: '4px'
              }}>
                {taskTitle}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--e-text)' }}>
                <Clock style={{
                  display: 'inline',
                  height: '16px',
                  width: '16px',
                  marginRight: '4px'
                }} />
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min totalt
              </p>
              {useMultipleSessions && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--e-text)',
                  marginTop: '4px'
                }}>
                  <Layers style={{
                    display: 'inline',
                    height: '12px',
                    width: '12px',
                    marginRight: '4px'
                  }} />
                  Delas upp i flera sessioner (max {maxSessionHours}h/session)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Multi-session mode toggle for long tasks */}
        {shouldUseMultiSession && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: 'var(--e-hover, #f9fafb)',
            borderRadius: '8px'
          }}>
            <input
              type="checkbox"
              id="multi-session"
              checked={useMultipleSessions}
              onChange={(e) => setUseMultipleSessions(e.target.checked)}
              style={{
                height: '16px',
                width: '16px',
                borderRadius: '4px',
                border: '1px solid var(--e-border, #d1d5db)',
                color: 'var(--primary-600)',
                cursor: 'pointer'
              }}
            />
            <label htmlFor="multi-session" style={{
              fontSize: '14px',
              color: 'var(--e-text)',
              cursor: 'pointer'
            }}>
              Dela upp i flera sessioner (rekommenderat för projekt över 8h)
            </label>
          </div>
        )}

        {/* Session length selector for multi-session mode */}
        {useMultipleSessions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--e-text)'
            }}>
              Max tid per session:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 4, 6, 8].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setMaxSessionHours(hours)}
                  style={{
                    flex: '1',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'colors 0.2s',
                    backgroundColor: maxSessionHours === hours ? 'var(--primary-600)' : 'var(--e-hover, #f3f4f6)',
                    color: maxSessionHours === hours ? 'var(--e-surface, white)' : 'var(--e-text)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (maxSessionHours !== hours) {
                      e.currentTarget.style.backgroundColor = 'var(--e-border, #e5e7eb)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (maxSessionHours !== hours) {
                      e.currentTarget.style.backgroundColor = 'var(--e-hover, #f3f4f6)';
                    }
                  }}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-session view */}
        {useMultipleSessions && sessionPlan ? (
          sessionPlan.sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
              <p style={{
                color: 'var(--e-text)',
                fontWeight: '500',
                marginBottom: '8px'
              }}>
                Inga lediga tider hittades
              </p>
              <p style={{
                fontSize: '14px',
                color: 'var(--e-text-secondary)'
              }}>
                Din kalender är full de närmaste dagarna. Försök manuellt eller justera deadline.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--e-text)',
                  marginBottom: '12px'
                }}>
                  Förslag på {sessionPlan.sessions.length} sessioner:
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '256px',
                  overflowY: 'auto'
                }}>
                  {sessionPlan.sessions.map((session, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--e-border, #e5e7eb)',
                        backgroundColor: 'var(--e-surface)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: 'var(--primary-600)'
                        }}>
                          Session {index + 1}/{sessionPlan.sessions.length}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--e-text-secondary)'
                        }}>
                          {Math.floor(session.durationMinutes / 60)}h {session.durationMinutes % 60}min
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--e-text)'
                      }}>
                        {session.day}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--e-text-secondary)'
                      }}>
                        {formatTime(session.start)} - {formatTime(session.end)}
                      </div>
                    </div>
                  ))}
                </div>
                {!sessionPlan.isComplete && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: 'var(--e-warning-light, #fffbeb)',
                    border: '1px solid var(--e-warning, #fcd34d)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ fontSize: '14px', color: 'var(--e-warning-dark, #92400e)' }}>
                      ⚠️ Kunde inte hitta tillräckligt med tid för alla {Math.floor(durationMinutes / 60)}h.
                      {Math.floor(sessionPlan.remainingMinutes / 60)}h {sessionPlan.remainingMinutes % 60}min återstår obokat.
                    </p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <div
                  style={{ flex: '1' }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('button');
                    if (btn) btn.style.backgroundColor = 'var(--e-success-dark, #059669)';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('button');
                    if (btn) btn.style.backgroundColor = 'var(--e-success, #10b981)';
                  }}
                >
                  <Button
                    onClick={handleBook}
                    disabled={isBooking}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--e-success, #10b981)'
                    }}
                  >
                  {isBooking ? (
                    <>
                      <div style={{
                        animation: 'spin 1s linear infinite',
                        borderRadius: '9999px',
                        height: '16px',
                        width: '16px',
                        borderBottom: '2px solid white',
                        marginRight: '8px'
                      }} />
                      Bokar...
                    </>
                  ) : (
                    <>
                      <Calendar style={{ height: '16px', width: '16px', marginRight: '8px' }} />
                      Boka alla {sessionPlan.sessions.length} sessioner
                    </>
                  )}
                  </Button>
                </div>
                <Button variant="ghost" onClick={onClose}>
                  <X style={{ height: '16px', width: '16px', marginRight: '4px' }} />
                  Avbryt
                </Button>
              </div>
            </>
          )
        ) : !useMultipleSessions && topSlots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
            <p style={{
              color: 'var(--e-text)',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Inga lediga tider hittades
            </p>
            <p style={{
              fontSize: '14px',
              color: 'var(--e-text-secondary)'
            }}>
              Din kalender är full de närmaste dagarna. Försök manuellt eller justera deadline.
            </p>
          </div>
        ) : !useMultipleSessions ? (
          <>
            <div>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--e-text)',
                marginBottom: '12px'
              }}>
                Föreslagna tider (prioriterade 08:00-16:00):
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topSlots.map((slot, index) => {
                  const isSelected = selectedSlot === slot;
                  const isPreferredTime =
                    slot.start.getHours() >= 8 && slot.start.getHours() < 16;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '16px',
                        borderRadius: '8px',
                        border: isSelected
                          ? '2px solid var(--primary-500)'
                          : '2px solid var(--e-border, #e5e7eb)',
                        backgroundColor: isSelected ? 'var(--e-surface)' : 'transparent',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--e-text-secondary, #9ca3af)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--e-border, #e5e7eb)';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ flex: '1' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            <span style={{
                              fontWeight: '600',
                              color: 'var(--e-text)'
                            }}>
                              {formatDate(slot.start)}
                            </span>
                            {isPreferredTime && (
                              <span style={{
                                fontSize: '12px',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                backgroundColor: 'var(--e-success-light, #d1fae5)',
                                color: 'var(--e-success-dark, #065f46)',
                                fontWeight: '500'
                              }}>
                                ⭐ Optimal tid
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--e-text-secondary)'
                          }}>
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                            <span style={{
                              marginLeft: '8px',
                              fontSize: '12px'
                            }}>
                              ({Math.floor(slot.durationMinutes / 60)}h {slot.durationMinutes % 60}min ledig)
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ marginLeft: '12px' }}>
                            <div style={{
                              height: '24px',
                              width: '24px',
                              borderRadius: '9999px',
                              backgroundColor: 'var(--primary-500)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <svg style={{ height: '16px', width: '16px', color: 'var(--e-surface, white)' }} fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <Button
                onClick={handleBook}
                disabled={!selectedSlot || isBooking}
                style={{ flex: '1' }}
              >
                {isBooking ? (
                  <>
                    <div style={{
                      animation: 'spin 1s linear infinite',
                      borderRadius: '9999px',
                      height: '16px',
                      width: '16px',
                      borderBottom: '2px solid var(--e-surface, white)',
                      marginRight: '8px'
                    }} />
                    Bokar...
                  </>
                ) : (
                  <>
                    <Calendar style={{ height: '16px', width: '16px', marginRight: '8px' }} />
                    Boka vald tid
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <X style={{ height: '16px', width: '16px', marginRight: '4px' }} />
                Hoppa över
              </Button>
            </div>
          </>
        ) : null}

        <p style={{
          fontSize: '12px',
          color: 'var(--e-text-secondary, #6b7280)',
          textAlign: 'center'
        }}>
          💡 Tid bokas i din Microsoft 365-kalender som "🎯 Fokus: {taskTitle}"
        </p>
      </div>
    </Dialog>
  );
}
