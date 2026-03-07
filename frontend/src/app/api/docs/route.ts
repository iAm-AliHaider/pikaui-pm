import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("project_id");
  try {
    const docs = await query(`
      SELECT d.*, p.name as project_name
      FROM pikaui.documents d
      JOIN pikaui.projects p ON d.project_id = p.id
      ${projectId ? "WHERE d.project_id = $1" : ""}
      ORDER BY d.uploaded_at DESC
    `, projectId ? [projectId] : []);
    return NextResponse.json(docs);
  } catch (e) {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { project_id, name, file_url, file_type, description, file_size } = await req.json();
  if (!project_id || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  try {
    const [doc] = await query(`
      INSERT INTO pikaui.documents (project_id, name, file_url, file_type, description, file_size)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [project_id, name, file_url || null, file_type || "doc", description || null, file_size || 0]);
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await query("DELETE FROM pikaui.documents WHERE id=$1", [id]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
