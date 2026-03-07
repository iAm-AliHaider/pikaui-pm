import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description = "",
      priority = "medium",
      status = "todo",
      assignee_name,
      project_name,
      project_id,
      due_date,
      start_date,
      hours_estimated,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Resolve project_id
    let resolvedProjectId = project_id ?? null;
    if (!resolvedProjectId && project_name) {
      const p = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.projects WHERE name ILIKE $1 LIMIT 1",
        [`%${project_name}%`]
      );
      resolvedProjectId = p?.id ?? null;
    }
    // Fallback: first project
    if (!resolvedProjectId) {
      const p = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.projects ORDER BY name LIMIT 1"
      );
      resolvedProjectId = p?.id ?? null;
    }

    // Resolve assignee_id
    let assignee_id: string | null = null;
    if (assignee_name) {
      const u = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.users WHERE name ILIKE $1 LIMIT 1",
        [`%${assignee_name}%`]
      );
      assignee_id = u?.id ?? null;
    }

    const task = await queryOne(`
      INSERT INTO pikaui.tasks
        (title, description, priority, status, project_id, assignee_id,
         due_date, start_date, hours_estimated, progress_pct, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6,
         $7::date, $8::date, $9, 0, NOW(), NOW())
      RETURNING *
    `, [
      title.trim(),
      description,
      priority,
      status,
      resolvedProjectId,
      assignee_id,
      due_date || null,
      start_date || null,
      hours_estimated || null,
    ]);

    // Log activity
    await query(
      `INSERT INTO pikaui.activity_log (project_id, actor, action, entity_type, entity_name, meta, created_at)
       VALUES ($1, 'User', 'created', 'task', $2, $3, NOW())`,
      [resolvedProjectId, title.trim(), JSON.stringify({ priority, status })]
    ).catch(() => {}); // non-blocking

    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    console.error("POST /api/tasks error:", e);
    return NextResponse.json({ error: "Create failed", detail: String(e) }, { status: 500 });
  }
}
