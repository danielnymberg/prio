import { Task, UserContext } from './types';
import { differenceInDays, differenceInHours } from 'date-fns';

/**
 * Beräkna hur mycket av en uppgift som kan göras med tillgänglig tid
 */
export function calculatePartialWork(
  taskDuration: number,
  availableTime: number
): {
  canDoToday: number;
  remainingTomorrow: number;
  suggestion: string;
} {
  const canDoToday = Math.min(taskDuration, availableTime);
  const remainingTomorrow = Math.max(0, taskDuration - availableTime);

  if (remainingTomorrow === 0) {
    return {
      canDoToday,
      remainingTomorrow: 0,
      suggestion: `Kan göras klart idag på ${canDoToday} min`
    };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return {
    canDoToday,
    remainingTomorrow,
    suggestion: `Gör ${formatTime(canDoToday)} idag, fortsätt ${formatTime(remainingTomorrow)} imorgon kl 09:00`
  };
}

/**
 * Beräknar dynamisk prioritet baserat på CPM-modellen + kontext
 * Implementerar forskningsbaserade principer från:
 * - Mere Urgency Effect (Zhu et al. 2018)
 * - Pareto-principen
 * - Ultradian rytm (90-min cykler)
 * - GTD (context-based action selection)
 */
export function calculateDynamicPriority(
  task: Task,
  allTasks: Task[],
  context: UserContext,
  now: Date = new Date()
): number {
  // Base från CPM-formel (redan beräknad i DB, men vi kan justera)
  const V = task.value_score;
  const T = task.time_sensitivity;
  const C = task.confidence;
  const E = task.effort;
  const basePriority = (V * T * C) / E;

  // 1. DEADLINE MULTIPLIER (baserat på deadline + tidskänslighet)
  let deadlineMultiplier = 1.0;
  if (task.deadline) {
    const hoursUntil = differenceInHours(new Date(task.deadline), now);
    const daysUntil = differenceInDays(new Date(task.deadline), now);
    const timeSens = task.time_sensitivity || 5;

    // Emergency: deadline < 24h OCH hög tidskänslighet
    if (hoursUntil < 24 && hoursUntil >= 0 && timeSens >= 7) {
      deadlineMultiplier = 5.0;
    }
    // Försenad
    else if (hoursUntil < 0) {
      const daysOverdue = Math.abs(daysUntil);
      deadlineMultiplier = 4.0 + Math.min(daysOverdue * 0.2, 2.0); // Max 6.0
    }
    // Imorgon
    else if (daysUntil <= 1) {
      deadlineMultiplier = 3.0;
    }
    // Inom 3 dagar
    else if (daysUntil <= 3) {
      deadlineMultiplier = 2.0;
    }
    // Inom veckan
    else if (daysUntil <= 7) {
      deadlineMultiplier = 1.5;
    }
    // Långt bort (> 30 dagar)
    else if (daysUntil > 30) {
      deadlineMultiplier = 0.7;
    }
  }

  // 2. DEPENDENCY MULTIPLIER (blockerar denna task andra viktiga tasks?)
  const blocksCount = task.blocks_task_ids?.length || 0;
  const blockedTasks = allTasks.filter(t =>
    task.blocks_task_ids?.includes(t.id) && t.status !== 'done'
  );
  const blockedHighPriorityCount = blockedTasks.filter(t => t.priority > 50).length;

  const dependencyMultiplier = 1 + (blocksCount * 0.2) + (blockedHighPriorityCount * 0.5);
  // +20% per blockerad task, +50% om den är high-priority

  // 3. TIME-FIT BONUS (passar uppgiften i nästa block?)
  const fitsInBlock = task.estimated_duration
    ? task.estimated_duration <= context.nextBlockDuration
    : true;
  const timeFitBonus = fitsInBlock ? 1.2 : 0.8;  // +20% om passar, -20% om ej

  // 4. STRATEGY BONUS (användaren valde "quick wins" eller "deep work")
  let strategyBonus = 1.0;
  if (context.strategy === 'quick_wins' && task.estimated_duration && task.estimated_duration < 45) {
    strategyBonus = 1.15;  // +15% för korta uppgifter
  } else if (context.strategy === 'deep_work' && task.estimated_duration && task.estimated_duration > 90) {
    strategyBonus = 1.15;  // +15% för långa uppgifter
  }

  // 5. ENERGY-MATCH BONUS (matchar uppgiften energinivån?)
  let energyBonus = 1.0;
  if (context.energyLevel === 'low' && task.effort <= 4) {
    energyBonus = 1.1;  // +10% för lätta uppgifter när energi är låg
  } else if (context.energyLevel === 'high' && task.effort >= 7) {
    energyBonus = 1.1;  // +10% för tunga uppgifter när energi är hög
  }

  // FINAL SCORE
  return basePriority * deadlineMultiplier * dependencyMultiplier * timeFitBonus * strategyBonus * energyBonus;
}

/**
 * Hämtar nästa uppgift baserat på kontext
 * Returnerar null om inga tasks är tillgängliga
 */
export function getNextTask(tasks: Task[], context: UserContext): Task | null {
  const now = new Date();

  // STEG 1: Hard filters (dessa kan INTE göras just nu)
  let available = tasks.filter(t => {
    if (t.status === 'done') return false;

    // Blockerad av annan uppgift?
    if (t.blocked_by_task_ids && t.blocked_by_task_ids.length > 0) {
      const hasBlocker = t.blocked_by_task_ids.some(blockerId => {
        const blocker = tasks.find(task => task.id === blockerId);
        return blocker && blocker.status !== 'done';
      });
      if (hasBlocker) return false;
    }

    // För lång för tillgänglig tid? Behåll ändå om uppgiften är viktig/försenad
    if (t.estimated_duration && t.estimated_duration > context.availableTime) {
      const isOverdue = t.deadline && new Date(t.deadline) < now;
      const isHighValue = (t.value_score || 5) >= 8;
      const isUrgent = (t.time_sensitivity || 5) >= 8;

      // Behåll viktiga uppgifter för partiellt arbete
      if (isOverdue || isHighValue || isUrgent) {
        return true;
      }

      // Filtrera bort låga prio-uppgifter som är för långa
      return false;
    }

    // För krävande för nuvarande energinivå?
    if (context.energyLevel === 'low' && t.effort > 7) return false;
    if (context.energyLevel === 'medium' && t.effort > 9) return false;

    return true;
  });

  if (available.length === 0) return null;

  // STEG 2: Beräkna dynamisk prioritet för varje task
  const scored = available.map(t => ({
    task: t,
    dynamicPriority: calculateDynamicPriority(t, tasks, context, now)
  }));

  // STEG 3: Sortera efter dynamisk prioritet
  scored.sort((a, b) => b.dynamicPriority - a.dynamicPriority);

  // STEG 4: Emergency override (deadline inom 24h OCH hög tidskänslighet)
  const emergencies = scored.filter(s => {
    if (!s.task.deadline) return false;
    const hoursUntil = differenceInHours(new Date(s.task.deadline), now);
    const timeSens = s.task.time_sensitivity || 5;
    return hoursUntil < 24 && hoursUntil >= 0 && timeSens >= 7;
  });

  if (emergencies.length > 0) {
    return emergencies[0].task;
  }

  // STEG 5: Returnera högsta prioritet
  return scored[0].task;
}

/**
 * Hämtar kö av nästa N uppgifter
 */
export function getTaskQueue(
  tasks: Task[],
  context: UserContext,
  limit: number = 5
): Task[] {
  const now = new Date();

  let available = tasks.filter(t => {
    if (t.status === 'done') return false;

    // Samma hard filters som getNextTask
    if (t.blocked_by_task_ids && t.blocked_by_task_ids.length > 0) {
      const hasBlocker = t.blocked_by_task_ids.some(blockerId => {
        const blocker = tasks.find(task => task.id === blockerId);
        return blocker && blocker.status !== 'done';
      });
      if (hasBlocker) return false;
    }

    return true;
  });

  const scored = available.map(t => ({
    task: t,
    dynamicPriority: calculateDynamicPriority(t, tasks, context, now)
  }));

  scored.sort((a, b) => b.dynamicPriority - a.dynamicPriority);

  return scored.slice(0, limit).map(s => s.task);
}

/**
 * Kontrollera om någon task är i emergency-läge
 */
export function hasEmergencyTasks(tasks: Task[]): boolean {
  const now = new Date();
  return tasks.some(t => {
    if (t.status === 'done' || !t.deadline) return false;
    const hoursUntil = differenceInHours(new Date(t.deadline), now);
    const timeSens = t.time_sensitivity || 5;
    return hoursUntil < 24 && hoursUntil >= 0 && timeSens >= 7;
  });
}
