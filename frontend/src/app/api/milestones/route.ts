import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  try {
    const rows = await query(`
      SELECT
        m.id, m.name, m.description,
        m.due_date::text, m.status,
        m.created_at::text,
        p.name as project_name,
        COALESCE(p.color,'#6c5ce7') as project_color,
        CASE
          WHEN m.due_date < CURRENT_DATE AND m.status='pending' THEN 'overdue'
          WHEN m.due_date <= CURRENT_DATE + INTERVAL '7 days'   THEN 'soon'
          ELSE 'on_track'
        END as health
      FROM pikaui.milestones m
      JOIN pikaui.projects p ON m.project_id = p.id
      ${projectId ? `WHERE m.project_id = '${projectId}'` : ""}
      ORDER BY m.due_date ASC
    `);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { project_id, name, description, due_date } = await req.json();
    if (!project_id || !name) return NextResponse.json({ error: "project_id and name required" }, { status: 400 });

    const row = await queryOne(`
      INSERT INTO pikaui.milestones (project_id, name, description, due_date)
      VALUES ($1, $2, $3, $4::date)
      RETURNING id, name, description, due_date::text, status
    `, [project_id, name, description || null, due_date || null]);

    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    const row = await queryOne(`
      UPDATE pikaui.milestones SET status=$1 WHERE id=$2
      RETURNING id, name, status
    `, [status, id]);
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
