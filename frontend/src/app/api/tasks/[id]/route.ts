import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, priority, progress_pct, hours_worked, start_date, due_date,
          hours_estimated, description, title, assignee_name } = body;

  try {
    let assignee_id: string | null = null;
    if (assignee_name) {
      const u = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.users WHERE name ILIKE $1", [`%${assignee_name}%`]
      );
      assignee_id = u?.id ?? null;
    }

    const row = await queryOne(`
      UPDATE pikaui.tasks SET
        status           = COALESCE($1, status),
        priority         = COALESCE($2, priority),
        progress_pct     = COALESCE($3, progress_pct),
        hours_worked     = COALESCE($4, hours_worked),
        start_date       = COALESCE($5::date, start_date),
        due_date         = COALESCE($6::date, due_date),
        hours_estimated  = COALESCE($7, hours_estimated),
        description      = COALESCE($8, description),
        title            = COALESCE($9, title),
        assignee_id      = CASE WHEN $10::text IS NOT NULL THEN $10::uuid ELSE assignee_id END,
        updated_at       = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      status ?? null, priority ?? null, progress_pct ?? null,
      hours_worked ?? null, start_date ?? null, due_date ?? null,
      hours_estimated ?? null, description ?? null, title ?? null,
      assignee_id, id
    ]);

    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [task, comments] = await Promise.all([
      queryOne(`
        SELECT t.*, u.name as assignee, p.name as project_name
        FROM pikaui.tasks t
        LEFT JOIN pikaui.users u ON t.assignee_id = u.id
        LEFT JOIN pikaui.projects p ON t.project_id = p.id
        WHERE t.id = $1
      `, [id]),
      query(`
        SELECT * FROM pikaui.task_comments WHERE task_id = $1 ORDER BY created_at ASC
      `, [id]),
    ]);
    return NextResponse.json({ task, comments });
  } catch (e) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
