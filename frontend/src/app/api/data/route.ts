import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const [projects, tasks, team, documents, sprints] = await Promise.all([
      query(`
        SELECT p.id, p.name, p.description, p.status,
               COALESCE(p.color, '#6c5ce7') as color,
               p.deadline, p.budget,
               u.name as manager, u.role as manager_role,
               COUNT(t.id)::int as total_tasks,
               COUNT(t.id) FILTER (WHERE t.status='done')::int as done_tasks,
               COALESCE(SUM(t.hours_worked), 0)::float as hours_worked,
               COALESCE(SUM(t.hours_estimated), 0)::float as hours_estimated
        FROM pikaui.projects p
        LEFT JOIN pikaui.users u ON p.manager_id = u.id
        LEFT JOIN pikaui.tasks t ON t.project_id = p.id
        GROUP BY p.id, p.name, p.description, p.status, p.color, p.deadline, p.budget, u.name, u.role
        ORDER BY p.status DESC, p.name
      `),
      query(`
        SELECT t.id, t.title, t.status, t.priority, t.description,
               COALESCE(t.progress_pct, 0)::int as progress_pct,
               COALESCE(t.hours_estimated, 0)::float as hours_estimated,
               COALESCE(t.hours_worked, 0)::float as hours_worked,
               t.start_date, t.due_date, t.created_at, t.updated_at,
               t.project_id,
               u.name as assignee,
               COALESCE(u.avatar_color, '#6c5ce7') as assignee_color,
               p.name as project_name,
               COALESCE(p.color, '#6c5ce7') as project_color
        FROM pikaui.tasks t
        LEFT JOIN pikaui.users u ON t.assignee_id = u.id
        LEFT JOIN pikaui.projects p ON t.project_id = p.id
        ORDER BY
          CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          t.updated_at DESC
      `),
      query(`
        SELECT u.id, u.name,
               COALESCE(u.role, 'Team Member') as role,
               u.email,
               COALESCE(u.avatar_color, '#6c5ce7') as avatar_color,
               u.department,
               COUNT(t.id)::int as total_tasks,
               COUNT(t.id) FILTER (WHERE t.status='todo')::int as todo,
               COUNT(t.id) FILTER (WHERE t.status='in_progress')::int as in_progress,
               COUNT(t.id) FILTER (WHERE t.status='done')::int as done,
               COALESCE(SUM(t.hours_worked), 0)::float as hours_worked
        FROM pikaui.users u
        LEFT JOIN pikaui.tasks t ON t.assignee_id = u.id
        GROUP BY u.id, u.name, u.role, u.email, u.avatar_color, u.department
        ORDER BY total_tasks DESC
      `),
      query(`
        SELECT d.id, d.project_id, d.name,
               d.file_url, d.file_type, d.file_size, d.description,
               COALESCE(d.qdrant_indexed, false) as qdrant_indexed,
               d.uploaded_at,
               p.name as project_name
        FROM pikaui.documents d
        JOIN pikaui.projects p ON d.project_id = p.id
        ORDER BY d.uploaded_at DESC
      `),
      query(`
        SELECT s.id, s.project_id, s.name,
               s.start_date, s.end_date, s.status,
               p.name as project_name
        FROM pikaui.sprints s
        JOIN pikaui.projects p ON s.project_id = p.id
        ORDER BY s.start_date DESC
      `),
    ]);

    return NextResponse.json({ projects, tasks, team, documents, sprints });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/data error:", msg);
    return NextResponse.json(
      { error: "DB error", detail: msg },
      { status: 500 }
    );
  }
}
