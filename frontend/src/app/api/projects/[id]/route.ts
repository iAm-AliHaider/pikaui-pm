import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, description, status, color, budget, deadline } = body;

    const row = await queryOne(`
      UPDATE pikaui.projects SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        status      = COALESCE($3, status),
        color       = COALESCE($4, color),
        budget      = COALESCE($5, budget),
        deadline    = COALESCE($6::date, deadline)
      WHERE id = $7
      RETURNING *
    `, [name ?? null, description ?? null, status ?? null, color ?? null, budget ?? null, deadline || null, id]);

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: "Update failed", detail: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await queryOne<{ name: string }>(
      "SELECT name FROM pikaui.projects WHERE id = $1", [id]
    );
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Cascade: delete time_logs, comments, tasks, sprints, documents, milestones, risks, activity
    await query("DELETE FROM pikaui.time_logs WHERE project_id = $1", [id]).catch(() => {});
    await query(`DELETE FROM pikaui.task_comments WHERE task_id IN (SELECT id FROM pikaui.tasks WHERE project_id=$1)`, [id]).catch(() => {});
    await query(`DELETE FROM pikaui.task_dependencies WHERE task_id IN (SELECT id FROM pikaui.tasks WHERE project_id=$1) OR depends_on_id IN (SELECT id FROM pikaui.tasks WHERE project_id=$1)`, [id]).catch(() => {});
    await query("DELETE FROM pikaui.sprint_tasks WHERE sprint_id IN (SELECT id FROM pikaui.sprints WHERE project_id=$1)", [id]).catch(() => {});
    await query("DELETE FROM pikaui.tasks WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.sprints WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.documents WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.milestones WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.risks WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.activity_log WHERE project_id = $1", [id]).catch(() => {});
    await query("DELETE FROM pikaui.projects WHERE id = $1", [id]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/projects/[id] error:", e);
    return NextResponse.json({ error: "Delete failed", detail: String(e) }, { status: 500 });
  }
}
