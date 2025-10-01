// ============================================
// PRIO APP TYPES
// ============================================

export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  importance: number; // 1-10
  urgency: number; // 1-10
  priority: number; // Computed: importance * 0.6 + urgency * 0.4
  deadline: string | null; // ISO timestamp
  status: TaskStatus;
  project_id: string | null;
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
  importance: number;
  urgency: number;
  deadline?: string;
  status?: TaskStatus;
  project_id?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  importance?: number;
  urgency?: number;
  deadline?: string;
  status?: TaskStatus;
  project_id?: string;
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

// Eisenhower Matrix Quadrants
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
