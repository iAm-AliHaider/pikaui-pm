export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  color: string;
  deadline?: string;
  budget?: number;
  manager?: string;
  manager_role?: string;
  total_tasks: number;
  done_tasks: number;
  hours_worked: number;
  hours_estimated: number;
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  description?: string;
  progress_pct: number;
  hours_estimated: number;
  hours_worked: number;
  start_date?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  project_id: string;
  project_name?: string;
  project_color?: string;
  assignee?: string;
  assignee_color?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  email?: string;
  avatar_color?: string;
  department?: string;
  hourly_rate?: number;
  total_tasks: number;
  todo: number;
  in_progress: number;
  done: number;
  hours_worked: number;
}

export interface Document {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  file_url?: string;
  file_type: string;
  file_size?: number;
  description?: string;
  qdrant_indexed?: boolean;
  uploaded_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  project_name?: string;
  name: string;
  start_date?: string;
  end_date?: string;
  status: string;
}

export interface DashboardData {
  projects: Project[];
  tasks: Task[];
  team: TeamMember[];
  documents: Document[];
  sprints: Sprint[];
}

export interface Comment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

// ── Analytics ────────────────────────────────────────────────
export interface BurndownPoint {
  log_date: string;
  remaining: number;
  completed: number;
}

export interface VelocityPoint {
  name: string;
  start_date?: string;
  end_date?: string;
  status: string;
  completed: number;
  total: number;
  hours_logged: number;
  hours_estimated: number;
}

export interface TimeLogEntry {
  id: string;
  hours: number;
  log_date: string;
  note?: string;
  user_name: string;
  avatar_color: string;
  task_title?: string;
  task_status?: string;
  project_name?: string;
  project_color?: string;
}

export interface TimeLogDay {
  log_date: string;
  user_name: string;
  avatar_color: string;
  hours: number;
  tasks_worked: number;
}

export interface BudgetStat {
  id: string;
  name: string;
  color: string;
  budget_allocated: number;
  cost_burned: number;
  total_hours: number;
  deadline?: string;
}

export interface TeamUtilStat {
  name: string;
  avatar_color: string;
  hourly_rate: number;
  hours_this_week: number;
  hours_this_month: number;
  active_tasks: number;
}

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  due_date?: string;
  status: "pending" | "achieved" | "missed";
  project_name: string;
  project_color: string;
  total_tasks: number;
  done_tasks: number;
  health: "on_track" | "soon" | "overdue";
}

export interface Risk {
  risk_type: string;
  severity: "low" | "medium" | "high";
  title: string;
  detail?: string;
}

export interface AnalyticsData {
  burndown:   BurndownPoint[];
  velocity:   VelocityPoint[];
  timeLogs:   TimeLogDay[];
  budget:     BudgetStat[];
  teamUtil:   TeamUtilStat[];
  milestones: Milestone[];
  risks:      Risk[];
}

// -- Activity Feed ------------------------------------
export interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name?: string;
  user_name?: string;
  meta?: Record<string, unknown>;
  created_at: string;
  task_title?: string;
  task_status?: string;
  project_name?: string;
  project_color?: string;
}

// -- Project Health (for cross-project summary) -------
export interface ProjectHealth {
  id: string;
  name: string;
  color: string;
  status: string;
  health_score: number;      // 0-100
  completion_pct: number;
  days_to_deadline?: number;
  overdue_tasks: number;
  budget_pct: number;
  total_tasks: number;
  done_tasks: number;
  hours_this_week: number;
}
