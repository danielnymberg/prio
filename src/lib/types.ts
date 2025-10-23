// ============================================
// PRIO APP TYPES - CPM MODEL
// ============================================

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type FocusStrategy = 'quick_wins' | 'deep_work' | 'balanced';

// Priority Flag - för tasks utan deadline
export type PriorityFlag = 'asap' | 'whenever' | 'someday';

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

  // Priority Flag för tasks utan deadline
  priority_flag: PriorityFlag | null;  // null = använd deadline eller default

  // Legacy fields (behåll för bakåtkompatibilitet)
  importance?: number;           // Deprecated
  urgency?: number;              // Deprecated

  // Dependency tracking
  blocks_task_ids: string[] | null;
  blocked_by_task_ids: string[] | null;

  // Retrospektiv mätning (Pareto-analys)
  result_impact: number | null;  // 1-10: Faktisk påverkan efter completion

  // Befintliga fält (behåll)
  deadline: string | null;             // När det måste vara KLART
  scheduled_start: string | null;      // När du planerar att BÖRJA arbeta på det
  calendar_event_id: string | null;    // Microsoft Calendar event ID (för synk)
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
  client_name: string | null;

  // Ekonomi
  quoted_hours: number;
  hourly_rate: number;
  external_costs: number;
  total_budget: number;

  // Tidsspårning
  project_deadline: string | null;
  completion_percentage: number;

  // Spiris-koppling
  spiris_project_id?: string | null;
  spiris_last_sync?: string | null;
  spiris_sync_enabled?: boolean;

  // Resursplanering (från Spiris)
  budgeted_hours?: number | null;
  budgeted_revenue?: number | null;
  invoiced_hours?: number | null;
  invoiced_amount?: number | null;
  actual_hours_worked?: number | null;
  project_manager?: string | null;
  start_date?: string | null;

  // Status
  color: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectMetrics {
  quoted_hours: number;
  logged_hours: number;
  billable_hours_remaining: number;
  estimated_remaining_hours: number;
  is_over_budget: boolean;
  budget_overage_hours: number;
  total_overage_hours: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  value_score: number;
  time_sensitivity: number;
  confidence: number;
  effort: number;
  blocks_task_ids?: string[];
  deadline?: string;
  scheduled_start?: string;
  priority_flag?: PriorityFlag | null;
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
  blocks_task_ids?: string[];
  blocked_by_task_ids?: string[];
  result_impact?: number;
  deadline?: string;
  scheduled_start?: string;
  calendar_event_id?: string;
  priority_flag?: PriorityFlag | null;
  status?: TaskStatus;
  project_id?: string;
  estimated_duration?: number;
  completed_at?: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  client_name?: string;
  quoted_hours: number;
  hourly_rate: number;
  external_costs?: number;
  project_deadline?: string;
  color?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  client_name?: string;
  quoted_hours?: number;
  hourly_rate?: number;
  external_costs?: number;
  project_deadline?: string;
  completion_percentage?: number;
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

// ============================================
// CAPACITY TIMELINE TYPES
// ============================================

export type ZoomLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';

export interface AbsencePeriod {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  absence_percentage: number; // 0-100
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAbsencePeriodInput {
  start_date: string;
  end_date: string;
  absence_percentage: number;
  reason?: string;
}

export interface CapacityThresholds {
  under: number;        // < detta = underbeläggning (standard: 70)
  sweet_start: number;  // Sweetspot start (standard: 70)
  sweet_end: number;    // Sweetspot slut (standard: 80)
  over: number;         // > detta = överbeläggning (standard: 90)
}

export interface CapacitySettings {
  working_hours_per_week: number;
  working_days: number[]; // 1-7 (1=Sön, 2=Mån, ..., 7=Lör)
  capacity_thresholds: CapacityThresholds;
}

export interface PeriodCapacity {
  period: string;           // "2025-W44" eller "2025-10" eller "2025-Q4"
  periodLabel: string;      // "V44" eller "Okt" eller "Q4"
  totalHours: number;       // Total tillgänglig kapacitet
  meetingHours: number;     // Bokade möten
  projectHours: number;     // Projekt-fokustid
  taskHours: number;        // Tasks
  usedHours: number;        // Total använd tid
  availableHours: number;   // Kvar att använda
  utilization: number;      // % beläggning (0-100+)
  status: 'under' | 'sweet' | 'high' | 'full' | 'over'; // Färgkod
  absencePercentage: number; // 0-100 (från absence_periods)
}
