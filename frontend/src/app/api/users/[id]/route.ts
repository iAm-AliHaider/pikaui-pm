import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

// PATCH /api/users/[id] — update user fields (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, role, department, system_role, pin, hourly_rate, is_active } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined)        { fields.push(`name = $${idx++}`);        values.push(name); }
    if (email !== undefined)       { fields.push(`email = $${idx++}`);       values.push(email); }
    if (role !== undefined)        { fields.push(`role = $${idx++}`);        values.push(role); }
    if (department !== undefined)  { fields.push(`department = $${idx++}`);  values.push(department); }
    if (hourly_rate !== undefined) { fields.push(`hourly_rate = $${idx++}`); values.push(hourly_rate); }
    if (pin !== undefined)         { fields.push(`pin = $${idx++}`);         values.push(pin); }
    if (is_active !== undefined)   { fields.push(`is_active = $${idx++}`);   values.push(is_active); }
    if (system_role !== undefined && ["admin", "manager", "member"].includes(system_role)) {
      fields.push(`system_role = $${idx++}`);
      values.push(system_role);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(id);
    const user = await queryOne(
      `UPDATE pikaui.users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, role, system_role, department, email, avatar_color, hourly_rate, is_active`,
      values
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    console.error("PATCH /api/users/[id] error:", e);
    return NextResponse.json({ error: "Update failed", detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/users/[id] — soft-delete (set is_active=false) (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await queryOne(
      "UPDATE pikaui.users SET is_active = false WHERE id = $1 RETURNING id, name",
      [id]
    );
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error("DELETE /api/users/[id] error:", e);
    return NextResponse.json({ error: "Deactivate failed" }, { status: 500 });
  }
}
