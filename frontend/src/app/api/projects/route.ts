import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const PROJECT_COLORS = [
  "#6c5ce7", "#0984e3", "#00b894", "#fd79a8",
  "#fdcb6e", "#e17055", "#a29bfe", "#00cec9",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description = "",
      status = "active",
      color,
      budget,
      deadline,
      manager_name,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Resolve manager_id
    let manager_id: string | null = null;
    if (manager_name) {
      const u = await queryOne<{ id: string }>(
        "SELECT id FROM pikaui.users WHERE name ILIKE $1 LIMIT 1",
        [`%${manager_name}%`]
      );
      manager_id = u?.id ?? null;
    }

    // Pick a random color if none supplied
    const resolvedColor = color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

    const project = await queryOne(`
      INSERT INTO pikaui.projects
        (name, description, status, color, budget, deadline, manager_id, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6::date, $7, NOW())
      RETURNING *
    `, [
      name.trim(),
      description,
      status,
      resolvedColor,
      budget || null,
      deadline || null,
      manager_id,
    ]);

    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    console.error("POST /api/projects error:", e);
    return NextResponse.json({ error: "Create failed", detail: String(e) }, { status: 500 });
  }
}
