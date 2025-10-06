import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, X } from 'lucide-react';
import { FreeTimeSlot, blockCalendarTime } from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';

interface AutoBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  durationMinutes: number;
  freeSlots: FreeTimeSlot[];
}

export function AutoBookModal({
  isOpen,
  onClose,
  taskTitle,
  durationMinutes,
  freeSlots,
}: AutoBookModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<FreeTimeSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSlot(null);
    }
  }, [isOpen]);

  const handleBook = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);

    try {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Boka tid automatiskt"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                {taskTitle}
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <Clock className="inline h-4 w-4 mr-1" />
                {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
              </p>
            </div>
          </div>
        </div>

        {topSlots.length === 0 ? (
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
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
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
                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
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
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Tid bokas i din Microsoft 365-kalender som "🎯 Fokus: {taskTitle}"
        </p>
      </div>
    </Modal>
  );
}
