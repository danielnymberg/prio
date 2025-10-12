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
      <div className="space-y-4">
        {/* Task info header */}
        <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-4 border border-sand-300 dark:border-charcoal-700">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-stone-600 dark:text-sand-100 mb-1">
                {taskTitle}
              </h3>
              <p className="text-sm text-stone-600 dark:text-sand-200">
                <Clock className="inline h-4 w-4 mr-1" />
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min totalt
              </p>
              {useMultipleSessions && (
                <p className="text-xs text-stone-600 dark:text-sand-300 mt-1">
                  <Layers className="inline h-3 w-3 mr-1" />
                  Delas upp i flera sessioner (max {maxSessionHours}h/session)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Multi-session mode toggle for long tasks */}
        {shouldUseMultiSession && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="multi-session"
              checked={useMultipleSessions}
              onChange={(e) => setUseMultipleSessions(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-copper-600 focus:ring-copper-400"
            />
            <label htmlFor="multi-session" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Dela upp i flera sessioner (rekommenderat för projekt över 8h)
            </label>
          </div>
        )}

        {/* Session length selector for multi-session mode */}
        {useMultipleSessions && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Max tid per session:
            </label>
            <div className="flex gap-2">
              {[2, 4, 6, 8].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => setMaxSessionHours(hours)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    maxSessionHours === hours
                      ? 'bg-copper-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
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
            <div className="text-center py-8">
              <div className="text-4xl mb-3">😕</div>
              <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                Inga lediga tider hittades
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Din kalender är full de närmaste dagarna. Försök manuellt eller justera deadline.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Förslag på {sessionPlan.sessions.length} sessioner:
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {sessionPlan.sessions.map((session, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-copper-600 dark:text-copper-400">
                          Session {index + 1}/{sessionPlan.sessions.length}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.floor(session.durationMinutes / 60)}h {session.durationMinutes % 60}min
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {session.day}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTime(session.start)} - {formatTime(session.end)}
                      </div>
                    </div>
                  ))}
                </div>
                {!sessionPlan.isComplete && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      ⚠️ Kunde inte hitta tillräckligt med tid för alla {Math.floor(durationMinutes / 60)}h.
                      {Math.floor(sessionPlan.remainingMinutes / 60)}h {sessionPlan.remainingMinutes % 60}min återstår obokat.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleBook}
                  disabled={isBooking}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isBooking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Bokar...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Boka alla {sessionPlan.sessions.length} sessioner
                    </>
                  )}
                </Button>
                <Button variant="ghost" onClick={onClose}>
                  <X className="h-4 w-4 mr-1" />
                  Avbryt
                </Button>
              </div>
            </>
          )
        ) : !useMultipleSessions && topSlots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">😕</div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              Inga lediga tider hittades
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Din kalender är full de närmaste dagarna. Försök manuellt eller justera deadline.
            </p>
          </div>
        ) : !useMultipleSessions ? (
          <>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Föreslagna tider (prioriterade 08:00-16:00):
              </h4>
              <div className="space-y-2">
                {topSlots.map((slot, index) => {
                  const isSelected = selectedSlot === slot;
                  const isPreferredTime =
                    slot.start.getHours() >= 8 && slot.start.getHours() < 16;

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedSlot(slot)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {formatDate(slot.start)}
                            </span>
                            {isPreferredTime && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
                                ⭐ Optimal tid
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                            <span className="ml-2 text-xs">
                              ({Math.floor(slot.durationMinutes / 60)}h {slot.durationMinutes % 60}min ledig)
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-3">
                            <div className="h-6 w-6 rounded-full bg-copper-500 flex items-center justify-center">
                              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleBook}
                disabled={!selectedSlot || isBooking}
                className="flex-1"
              >
                {isBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Bokar...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Boka vald tid
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                <X className="h-4 w-4 mr-1" />
                Hoppa över
              </Button>
            </div>
          </>
        ) : null}

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Tid bokas i din Microsoft 365-kalender som "🎯 Fokus: {taskTitle}"
        </p>
      </div>
    </Dialog>
  );
}
