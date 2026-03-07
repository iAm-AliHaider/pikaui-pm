import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

const AVATAR_COLORS = [
  "#6c5ce7", "#0984e3", "#00b894", "#fd79a8",
  "#fdcb6e", "#e17055", "#a29bfe", "#00cec9",
];

// GET /api/users — list all active users
export async function GET() {
  try {
    const users = await query(`
      SELECT id, name, role, system_role, department, email,
             avatar_color, hourly_rate, is_active, created_at
      FROM pikaui.users
      WHERE is_active = true
      ORDER BY system_role DESC, name ASC
    `);
    return NextResponse.json(users);
  } catch (e) {
    console.error("GET /api/users error:", e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

// POST /api/users — create a new user (admin only - checked client-side + here)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, department, system_role = "member", pin = "1234", hourly_rate = 75 } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Pick avatar color round-robin
    const existing = await queryOne<{ cnt: number }>("SELECT COUNT(*)::int as cnt FROM pikaui.users", []);
    const colorIdx = (existing?.cnt ?? 0) % AVATAR_COLORS.length;
    const avatar_color = AVATAR_COLORS[colorIdx];

    const user = await queryOne(`
      INSERT INTO pikaui.users (name, email, role, department, system_role, pin, hourly_rate, avatar_color)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, role, system_role, department, email, avatar_color, hourly_rate, is_active, created_at
    `, [
      name.trim(),
      email?.trim() || null,
      role?.trim() || "Team Member",
      department?.trim() || "General",
      ["admin", "manager", "member"].includes(system_role) ? system_role : "member",
      pin || "1234",
      hourly_rate || 75,
      avatar_color,
    ]);

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error("POST /api/users error:", e);
    return NextResponse.json({ error: "Create failed", detail: String(e) }, { status: 500 });
  }
}
