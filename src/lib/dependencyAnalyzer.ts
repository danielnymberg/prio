import { Task } from './types';

export interface DependencyChain {
  depth: number;
  chain: Task[];
  blockedCount: number;
  totalEstimatedTime: number;
  criticalityScore: number;
  isDeadlineCritical: boolean;
}

const MAX_DEPTH = 10; // Prevent infinite loops

/**
 * Find all tasks that are blocked by a given task (recursively)
 */
function findBlockedTasks(
  taskId: string,
  allTasks: Task[],
  visited: Set<string> = new Set(),
  depth: number = 0
): Task[] {
  // Prevent infinite recursion
  if (depth >= MAX_DEPTH || visited.has(taskId)) {
    return [];
  }

  visited.add(taskId);

  // Find tasks that are directly blocked by this task
  const directlyBlocked = allTasks.filter(
    (t) =>
      t.blocked_by_task_ids &&
      t.blocked_by_task_ids.includes(taskId) &&
      t.status !== 'done'
  );

  let allBlocked: Task[] = [...directlyBlocked];

  // Recursively find tasks blocked by the directly blocked tasks
  for (const blockedTask of directlyBlocked) {
    const transitiveBlocked = findBlockedTasks(
      blockedTask.id,
      allTasks,
      visited,
      depth + 1
    );
    allBlocked = [...allBlocked, ...transitiveBlocked];
  }

  return allBlocked;
}

/**
 * Analyze dependency chains for a task
 */
export function analyzeDependencyChain(
  task: Task,
  allTasks: Task[]
): DependencyChain | null {
  // Only analyze tasks that block other tasks
  if (!task.blocks_task_ids || task.blocks_task_ids.length === 0) {
    return null;
  }

  const blockedTasks = findBlockedTasks(task.id, allTasks);

  // No blocked tasks found
  if (blockedTasks.length === 0) {
    return null;
  }

  // Build chain (task + all blocked tasks)
  const chain = [task, ...blockedTasks];

  // Calculate total estimated time
  const totalEstimatedTime = chain.reduce(
    (sum, t) => sum + (t.estimated_duration || 0),
    0
  );

  // Calculate max depth
  const calculateDepth = (t: Task, depth: number = 0): number => {
    if (depth >= MAX_DEPTH) return depth;

    const blocked = allTasks.filter(
      (bt) =>
        bt.blocked_by_task_ids &&
        bt.blocked_by_task_ids.includes(t.id) &&
        bt.status !== 'done'
    );

    if (blocked.length === 0) return depth;

    return Math.max(...blocked.map((bt) => calculateDepth(bt, depth + 1)));
  };

  const depth = calculateDepth(task);

  // Check if any task in chain has urgent deadline
  const now = new Date();
  const hasUrgentDeadline = chain.some((t) => {
    if (!t.deadline) return false;
    const deadline = new Date(t.deadline);
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil < 48; // Within 48 hours
  });

  // Calculate criticality score (0-100)
  // Factors: depth, number of blocked tasks, total time, deadline urgency
  let criticalityScore = 0;

  // Depth contribution (max 30 points)
  criticalityScore += Math.min(depth * 5, 30);

  // Blocked count contribution (max 30 points)
  criticalityScore += Math.min(blockedTasks.length * 3, 30);

  // Time contribution (max 20 points) - based on hours
  const totalHours = totalEstimatedTime / 60;
  criticalityScore += Math.min(totalHours * 2, 20);

  // Deadline urgency (max 20 points)
  if (hasUrgentDeadline) {
    criticalityScore += 20;
  }

  return {
    depth,
    chain,
    blockedCount: blockedTasks.length,
    totalEstimatedTime,
    criticalityScore: Math.round(criticalityScore),
    isDeadlineCritical: hasUrgentDeadline,
  };
}

/**
 * Find all critical dependency chains in the task list
 */
export function findCriticalDependencyChains(
  tasks: Task[],
  minCriticalityScore: number = 40
): DependencyChain[] {
  const chains: DependencyChain[] = [];
  const analyzed = new Set<string>();

  for (const task of tasks) {
    // Skip completed tasks and already analyzed
    if (task.status === 'done' || analyzed.has(task.id)) {
      continue;
    }

    const chain = analyzeDependencyChain(task, tasks);

    if (chain && chain.criticalityScore >= minCriticalityScore) {
      chains.push(chain);
      analyzed.add(task.id);
    }
  }

  // Sort by criticality (highest first)
  return chains.sort((a, b) => b.criticalityScore - a.criticalityScore);
}

/**
 * Get criticality level label
 */
export function getCriticalityLevel(score: number): {
  level: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  color: string;
} {
  if (score >= 80) {
    return {
      level: 'critical',
      label: 'Kritisk',
      color: 'text-red-600 dark:text-red-400',
    };
  } else if (score >= 60) {
    return {
      level: 'high',
      label: 'Hög',
      color: 'text-warning-600 dark:text-warning-400',
    };
  } else if (score >= 40) {
    return {
      level: 'medium',
      label: 'Medel',
      color: 'text-warning-600 dark:text-warning-400',
    };
  } else {
    return {
      level: 'low',
      label: 'Låg',
      color: 'text-gray-600 dark:text-gray-400',
    };
  }
}
