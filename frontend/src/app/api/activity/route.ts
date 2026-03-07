import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const limit     = parseInt(searchParams.get("limit") || "50");
  const days      = parseInt(searchParams.get("days")  || "14");

  try {
    const rows = await query(`
      SELECT
        a.id, a.action, a.entity_type, a.entity_name,
        a.user_name, a.meta, a.created_at::text,
        t.title  as task_title, t.status as task_status,
        p.name   as project_name,
        COALESCE(p.color, '#6c5ce7') as project_color
      FROM pikaui.activity_log a
      LEFT JOIN pikaui.tasks    t ON a.task_id    = t.id
      LEFT JOIN pikaui.projects p ON a.project_id = p.id
      WHERE a.created_at >= NOW() - ($1 || ' days')::INTERVAL
        ${projectId ? `AND a.project_id = '${projectId}'` : ""}
      ORDER BY a.created_at DESC
      LIMIT $2
    `, [days, limit]);

    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { project_id, task_id, user_name, action, entity_type, entity_name, meta } = await req.json();
    if (!action || !entity_type) return NextResponse.json({ error: "action and entity_type required" }, { status: 400 });

    const row = await queryOne(`
      INSERT INTO pikaui.activity_log
        (project_id, task_id, user_name, action, entity_type, entity_name, meta)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      RETURNING id, action, entity_name, created_at::text
    `, [project_id || null, task_id || null, user_name || "System",
        action, entity_type, entity_name || null,
        meta ? JSON.stringify(meta) : "{}"]
    );
    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
