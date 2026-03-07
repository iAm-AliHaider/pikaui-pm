import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const userId    = searchParams.get("userId");
  const days      = parseInt(searchParams.get("days") || "14");

  try {
    const rows = await query(`
      SELECT
        tl.id, tl.hours, tl.log_date::text, tl.note,
        u.name   as user_name,
        COALESCE(u.avatar_color,'#6c5ce7') as avatar_color,
        t.title  as task_title, t.status as task_status,
        p.name   as project_name, p.color as project_color
      FROM pikaui.time_logs tl
      LEFT JOIN pikaui.users    u ON tl.user_id    = u.id
      LEFT JOIN pikaui.tasks    t ON tl.task_id    = t.id
      LEFT JOIN pikaui.projects p ON tl.project_id = p.id
      WHERE tl.log_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
        ${projectId ? `AND tl.project_id = '${projectId}'` : ""}
        ${userId    ? `AND tl.user_id    = '${userId}'`    : ""}
      ORDER BY tl.log_date DESC, u.name
    `, [days]);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { task_id, project_id, user_id, hours, log_date, note } = await req.json();
    if (!project_id || !hours) return NextResponse.json({ error: "project_id and hours required" }, { status: 400 });

    const row = await queryOne(`
      INSERT INTO pikaui.time_logs (task_id, project_id, user_id, hours, log_date, note)
      VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6)
      RETURNING id, hours, log_date::text, note
    `, [task_id || null, project_id, user_id || null, hours, log_date || null, note || null]);

    // Also update task.hours_worked if task provided
    if (task_id) {
      await query("UPDATE pikaui.tasks SET hours_worked = COALESCE(hours_worked,0) + $1, updated_at = NOW() WHERE id = $2", [hours, task_id]);
    }

    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
