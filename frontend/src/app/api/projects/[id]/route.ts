import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

// PATCH /api/projects/[id] — update project (close = status:'closed') (manager/admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, status, deadline, budget, color, manager_name } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined)        { fields.push(`name = $${idx++}`);        values.push(name); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (color !== undefined)       { fields.push(`color = $${idx++}`);       values.push(color); }
    if (budget !== undefined)      { fields.push(`budget = $${idx++}`);      values.push(budget); }
    if (deadline !== undefined)    { fields.push(`deadline = $${idx++}::date`); values.push(deadline || null); }
    if (status !== undefined) {
      const valid = ["active", "planning", "closed", "on_hold"];
      if (!valid.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (manager_name !== undefined) {
      const u = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.users WHERE name ILIKE $1 LIMIT 1", [`%${manager_name}%`]
      );
      if (u) { fields.push(`manager_id = $${idx++}`); values.push(u.id); }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(id);
    const project = await queryOne(
      `UPDATE pikaui.projects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (e) {
    console.error("PATCH /api/projects/[id] error:", e);
    return NextResponse.json({ error: "Update failed", detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — hard delete (admin only — cascade handled by FK constraints)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Cascade delete in order (FK constraints)
    await query("DELETE FROM pikaui.time_logs        WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.task_comments    WHERE task_id IN (SELECT id FROM pikaui.tasks WHERE project_id = $1)", [id]);
    await query("DELETE FROM pikaui.task_dependencies WHERE task_id IN (SELECT id FROM pikaui.tasks WHERE project_id = $1) OR depends_on_id IN (SELECT id FROM pikaui.tasks WHERE project_id = $1)", [id]);
    await query("DELETE FROM pikaui.sprint_tasks     WHERE task_id IN (SELECT id FROM pikaui.tasks WHERE project_id = $1)", [id]);
    await query("DELETE FROM pikaui.tasks            WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.sprints          WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.documents        WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.milestones       WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.risks            WHERE project_id = $1", [id]);
    await query("DELETE FROM pikaui.activity_log     WHERE project_id = $1", [id]);
    const result = await queryOne("DELETE FROM pikaui.projects WHERE id = $1 RETURNING id, name", [id]);

    if (!result) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ success: true, deleted: result });
  } catch (e) {
    console.error("DELETE /api/projects/[id] error:", e);
    return NextResponse.json({ error: "Delete failed", detail: String(e) }, { status: 500 });
  }
}
