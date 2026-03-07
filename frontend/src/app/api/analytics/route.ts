import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  try {
    const projectFilter = projectId ? `AND p.id = '${projectId}'` : "";

    // ── Burndown: tasks remaining per day over last 30 days ──────
    const burndown = await query(`
      SELECT
        d::date as log_date,
        COUNT(t.id) FILTER (
          WHERE t.status != 'done'
          AND   t.created_at::date <= d::date
        )::int as remaining,
        COUNT(t.id) FILTER (
          WHERE t.status = 'done'
          AND   t.updated_at::date <= d::date
        )::int as completed
      FROM   generate_series(
               CURRENT_DATE - INTERVAL '29 days',
               CURRENT_DATE,
               INTERVAL '1 day'
             ) AS d
      CROSS JOIN pikaui.tasks t
      JOIN pikaui.projects p ON t.project_id = p.id
      WHERE  1=1 ${projectFilter}
      GROUP BY d
      ORDER BY d
    `);

    // ── Velocity: tasks completed per sprint ─────────────────────
    const velocity = await query(`
      SELECT
        s.name,
        s.start_date, s.end_date, s.status,
        COUNT(t.id) FILTER (WHERE t.status='done')::int       as completed,
        COUNT(t.id)::int                                       as total,
        COALESCE(SUM(t.hours_worked),0)::float                as hours_logged,
        COALESCE(SUM(t.hours_estimated),0)::float             as hours_estimated
      FROM pikaui.sprints s
      JOIN pikaui.projects p ON s.project_id = p.id
      LEFT JOIN pikaui.sprint_tasks st ON st.sprint_id = s.id
      LEFT JOIN pikaui.tasks t         ON t.id = st.task_id
      WHERE 1=1 ${projectFilter}
      GROUP BY s.id, s.name, s.start_date, s.end_date, s.status
      ORDER BY s.start_date DESC
      LIMIT 10
    `);

    // ── Time logs: daily hours last 14 days, grouped by user ─────
    const timeLogs = await query(`
      SELECT
        tl.log_date::text,
        u.name  as user_name,
        COALESCE(u.avatar_color,'#6c5ce7') as avatar_color,
        SUM(tl.hours)::float  as hours,
        COUNT(DISTINCT tl.task_id)::int as tasks_worked
      FROM pikaui.time_logs tl
      JOIN pikaui.users     u ON tl.user_id = u.id
      JOIN pikaui.projects  p ON tl.project_id = p.id
      WHERE tl.log_date >= CURRENT_DATE - INTERVAL '13 days'
      ${projectFilter.replace('p.id', 'tl.project_id')}
      GROUP BY tl.log_date, u.name, u.avatar_color
      ORDER BY tl.log_date ASC, hours DESC
    `);

    // ── Budget burn ───────────────────────────────────────────────
    const budget = await query(`
      SELECT
        p.id, p.name, p.color,
        COALESCE(p.budget,0)::float                          as budget_allocated,
        SUM(tl.hours * COALESCE(u.hourly_rate,75))::float   as cost_burned,
        SUM(tl.hours)::float                                 as total_hours,
        p.deadline
      FROM pikaui.projects p
      LEFT JOIN pikaui.time_logs tl ON tl.project_id = p.id
      LEFT JOIN pikaui.users u      ON tl.user_id = u.id
      WHERE 1=1 ${projectFilter}
      GROUP BY p.id, p.name, p.color, p.budget, p.deadline
      ORDER BY p.name
    `);

    // ── Team utilization: hours per person per week ───────────────
    const teamUtil = await query(`
      SELECT
        u.name,
        COALESCE(u.avatar_color,'#6c5ce7') as avatar_color,
        COALESCE(u.hourly_rate, 75)::float  as hourly_rate,
        SUM(tl.hours) FILTER (
          WHERE tl.log_date >= date_trunc('week', CURRENT_DATE)
        )::float as hours_this_week,
        SUM(tl.hours) FILTER (
          WHERE tl.log_date >= CURRENT_DATE - INTERVAL '29 days'
        )::float as hours_this_month,
        COUNT(DISTINCT t.id)::int as active_tasks
      FROM pikaui.users u
      LEFT JOIN pikaui.time_logs tl ON tl.user_id = u.id
      LEFT JOIN pikaui.tasks     t  ON t.assignee_id = u.id AND t.status = 'in_progress'
      GROUP BY u.id, u.name, u.avatar_color, u.hourly_rate
      ORDER BY hours_this_week DESC
    `);

    // ── Milestones ────────────────────────────────────────────────
    const milestones = await query(`
      SELECT
        m.id, m.name, m.due_date::text, m.status, m.description,
        p.name as project_name, p.color as project_color,
        COUNT(t.id)::int                                         as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status='done')::int         as done_tasks,
        CASE
          WHEN m.due_date < CURRENT_DATE AND m.status='pending' THEN 'overdue'
          WHEN m.due_date <= CURRENT_DATE + 7              THEN 'soon'
          ELSE 'on_track'
        END as health
      FROM pikaui.milestones m
      JOIN pikaui.projects p ON m.project_id = p.id
      LEFT JOIN pikaui.tasks t ON t.project_id = p.id
        AND t.due_date <= m.due_date
        AND t.due_date IS NOT NULL
      WHERE 1=1 ${projectFilter}
      GROUP BY m.id, m.name, m.due_date, m.status, m.description, p.name, p.color
      ORDER BY m.due_date ASC
    `);

    // ── Active risks (auto-detected) ──────────────────────────────
    const risks = await query(`
      WITH
        overdue_tasks AS (
          SELECT p.id as project_id, p.name as project_name,
                 COUNT(t.id)::int as count
          FROM pikaui.tasks t JOIN pikaui.projects p ON t.project_id=p.id
          WHERE t.status != 'done' AND t.due_date < CURRENT_DATE
          ${projectFilter} GROUP BY p.id, p.name HAVING COUNT(t.id)>0
        ),
        overloaded AS (
          SELECT u.name, SUM(tl.hours)::float as weekly_hours
          FROM pikaui.time_logs tl JOIN pikaui.users u ON tl.user_id=u.id
          WHERE tl.log_date >= date_trunc('week', CURRENT_DATE)
          GROUP BY u.name HAVING SUM(tl.hours) > 40
        ),
        budget_risk AS (
          SELECT p.id as project_id, p.name as project_name,
                 COALESCE(p.budget,0)::float as budget,
                 SUM(tl.hours * COALESCE(u.hourly_rate,75))::float as burned
          FROM pikaui.projects p
          LEFT JOIN pikaui.time_logs tl ON tl.project_id=p.id
          LEFT JOIN pikaui.users u ON tl.user_id=u.id
          ${projectFilter ? "WHERE " + projectFilter.replace("AND ","") : ""}
          GROUP BY p.id, p.name, p.budget
          HAVING COALESCE(p.budget,0)>0
             AND SUM(tl.hours * COALESCE(u.hourly_rate,75)) > COALESCE(p.budget,0)*0.8
        )
      SELECT 'overdue'::text as risk_type, 'high'::text as severity,
             ot.project_name || ': ' || ot.count || ' overdue task(s)' as title,
             'Tasks past due date with no completion' as detail
      FROM overdue_tasks ot
      UNION ALL
      SELECT 'overloaded','high',
             ol.name || ' logged ' || ol.weekly_hours || 'h this week',
             'Team member over 40h/week capacity'
      FROM overloaded ol
      UNION ALL
      SELECT 'budget','medium',
             br.project_name || ': ' || ROUND((br.burned/br.budget*100)::numeric,0) || '% budget used',
             'Project is over 80% of budget'
      FROM budget_risk br
      ORDER BY severity DESC
    `);

    return NextResponse.json({ burndown, velocity, timeLogs, budget, teamUtil, milestones, risks });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/analytics error:", msg);
    return NextResponse.json({ error: "Analytics DB error", detail: msg }, { status: 500 });
  }
}
