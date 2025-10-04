// ============================================
// PRIO APP TYPES - CPM MODEL
// ============================================

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type FocusStrategy = 'quick_wins' | 'deep_work' | 'balanced';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;

  // CPM Prioriteringsparametrar (ersätter importance/urgency)
  value_score: number;           // 1-10: Objektiva konsekvenser
  time_sensitivity: number;      // 1-10: Faktisk kostnad av fördröjning
  confidence: number;            // 1-10: Sannolikhet för resultat
  effort: number;                // 1-10: Faktisk tid/resurser
  priority: number;              // Beräknat: (V × T × C) / E

  // Legacy fields (behåll för bakåtkompatibilitet)
  importance?: number;           // Deprecated
  urgency?: number;              // Deprecated

  // Konsekvens-metadata (anti-urgency-bias)
  consequence_1week: string | null;
  consequence_1month: string | null;
  consequence_1year: string | null;
  consequence_deadline: string | null;  // ISO timestamp

  // Dependency tracking
  blocks_task_ids: string[] | null;
  blocked_by_task_ids: string[] | null;

  // Retrospektiv mätning (Pareto-analys)
  result_impact: number | null;  // 1-10: Faktisk påverkan efter completion

  // Befintliga fält (behåll)
  deadline: string | null;
  status: TaskStatus;
  project_id: string | null;
  estimated_duration: number | null;  // Minuter
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  value_score: number;
  time_sensitivity: number;
  confidence: number;
  effort: number;
  consequence_1week?: string;
  consequence_1month?: string;
  consequence_1year?: string;
  consequence_deadline?: string;
  blocks_task_ids?: string[];
  deadline?: string;
  status?: TaskStatus;
  project_id?: string;
  estimated_duration?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  value_score?: number;
  time_sensitivity?: number;
  confidence?: number;
  effort?: number;
  consequence_1week?: string;
  consequence_1month?: string;
  consequence_1year?: string;
  consequence_deadline?: string;
  blocks_task_ids?: string[];
  blocked_by_task_ids?: string[];
  result_impact?: number;
  deadline?: string;
  status?: TaskStatus;
  project_id?: string;
  estimated_duration?: number;
  completed_at?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
}

export interface UserContext {
  availableTime: number;  // Minuter tillgängliga för fokusarbete
  energyLevel: EnergyLevel;
  strategy: FocusStrategy;
  currentDate: Date;
  nextBlockDuration: number;  // Vanligtvis 90 minuter
}

export interface DailyCheckIn {
  date: string;  // YYYY-MM-DD
  availableTime: number;
  energyLevel: EnergyLevel;
  strategy: FocusStrategy;
}

// Quadrant type (behåll för Matrix-vy)
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface QuadrantInfo {
  id: Quadrant;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  filter: (task: Task) => boolean;
}
