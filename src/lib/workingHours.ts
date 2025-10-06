import { differenceInHours, addDays, setHours, setMinutes, isWeekend } from 'date-fns';

export interface WorkingHoursConfig {
  normalStart: number;    // Default 8 (kl 08:00)
  normalEnd: number;      // Default 16 (kl 16:00)
  flexStart: number;      // Default 6 (kl 06:00)
  flexEnd: number;        // Default 18 (kl 18:00)
  includeWeekends: boolean; // Default false
}

const DEFAULT_CONFIG: WorkingHoursConfig = {
  normalStart: 8,
  normalEnd: 16,
  flexStart: 6,
  flexEnd: 18,
  includeWeekends: false,
};

/**
 * Hämta arbetskonfiguration från localStorage eller använd default
 */
export function getWorkingHoursConfig(): WorkingHoursConfig {
  const stored = localStorage.getItem('prio-working-hours');
  if (!stored) return DEFAULT_CONFIG;

  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Spara arbetskonfiguration
 */
export function saveWorkingHoursConfig(config: WorkingHoursConfig): void {
  localStorage.setItem('prio-working-hours', JSON.stringify(config));
}

/**
 * Beräkna arbetstimmar mellan nu och deadline
 * Tar hänsyn till normalarbetstid, helger, etc.
 */
export function calculateWorkingHoursUntil(
  deadline: Date,
  now: Date = new Date(),
  config: WorkingHoursConfig = getWorkingHoursConfig()
): number {
  let totalHours = 0;
  let currentDay = new Date(now);
  const endDate = new Date(deadline);

  // Om deadline redan passerat, returnera negativt värde
  if (endDate < now) {
    const hoursOverdue = differenceInHours(now, endDate);
    return -Math.abs(hoursOverdue); // Negativt tal
  }

  while (currentDay < endDate) {
    // Hoppa över helger om inte includeWeekends
    if (!config.includeWeekends && isWeekend(currentDay)) {
      currentDay = addDays(currentDay, 1);
      continue;
    }

    const dayStart = setMinutes(setHours(new Date(currentDay), config.normalStart), 0);
    const dayEnd = setMinutes(setHours(new Date(currentDay), config.normalEnd), 0);

    // Första dagen: Från nu till arbetsdagens slut
    if (currentDay.toDateString() === now.toDateString()) {
      if (now < dayStart) {
        // Innan arbetsdag börjat: hela arbetsdagen tillgänglig
        totalHours += config.normalEnd - config.normalStart;
      } else if (now >= dayStart && now < dayEnd) {
        // Mitt i arbetsdag: räkna återstående timmar
        const hoursLeft = differenceInHours(dayEnd, now);
        totalHours += Math.max(0, hoursLeft);
      }
      // Om nu är efter arbetsdagens slut: 0 timmar idag
    }
    // Sista dagen: Från arbetsdagens start till deadline
    else if (currentDay.toDateString() === endDate.toDateString()) {
      if (endDate <= dayStart) {
        // Deadline före arbetsdagen börjar: 0 timmar
        break;
      } else if (endDate >= dayEnd) {
        // Deadline efter arbetsdagens slut: hela arbetsdagen
        totalHours += config.normalEnd - config.normalStart;
      } else {
        // Deadline mitt i arbetsdagen
        const hoursUntilDeadline = differenceInHours(endDate, dayStart);
        totalHours += Math.max(0, hoursUntilDeadline);
      }
    }
    // Dagar mellan: hela arbetsdagar
    else {
      totalHours += config.normalEnd - config.normalStart;
    }

    currentDay = addDays(currentDay, 1);
  }

  return totalHours;
}

/**
 * Formatera arbetstimmar till läsbar sträng
 */
export function formatWorkingHours(hours: number): string {
  if (hours < 0) {
    return `${Math.abs(Math.round(hours))}h försenad`;
  }

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min arbetstid kvar`;
  }

  if (hours < 8) {
    return `${Math.round(hours)}h arbetstid kvar`;
  }

  const days = Math.floor(hours / 8);
  const remainingHours = Math.round(hours % 8);

  if (remainingHours === 0) {
    return `${days} arbetsdag${days > 1 ? 'ar' : ''} kvar`;
  }

  return `${days} arbetsdag${days > 1 ? 'ar' : ''} + ${remainingHours}h kvar`;
}

/**
 * Beräkna om task kan hinnas med innan deadline
 */
export function canFinishBeforeDeadline(
  task: { deadline: string | null; estimated_duration: number | null },
  _availableTimeToday: number,
  now: Date = new Date()
): {
  canFinish: boolean;
  workingHoursUntil: number;
  hoursNeeded: number;
  reason?: string;
} {
  if (!task.deadline || !task.estimated_duration) {
    return { canFinish: true, workingHoursUntil: 0, hoursNeeded: 0 };
  }

  const deadline = new Date(task.deadline);
  const workingHoursUntil = calculateWorkingHoursUntil(deadline, now);
  const hoursNeeded = task.estimated_duration / 60;

  if (workingHoursUntil < 0) {
    return {
      canFinish: false,
      workingHoursUntil,
      hoursNeeded,
      reason: 'Deadline redan passerad'
    };
  }

  if (workingHoursUntil < hoursNeeded) {
    return {
      canFinish: false,
      workingHoursUntil,
      hoursNeeded,
      reason: `Behöver ${hoursNeeded.toFixed(1)}h men endast ${workingHoursUntil.toFixed(1)}h arbetstid kvar`
    };
  }

  return {
    canFinish: true,
    workingHoursUntil,
    hoursNeeded
  };
}
