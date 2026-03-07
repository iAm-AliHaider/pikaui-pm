import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, pin } = await req.json();
    if (!userId || !pin) {
      return NextResponse.json({ error: "userId and pin required" }, { status: 400 });
    }

    const user = await queryOne<{
      id: string; name: string; role: string; system_role: string;
      department: string; avatar_color: string; email: string; is_active: boolean;
    }>(
      `SELECT id, name, role, system_role, department, avatar_color, email, is_active
       FROM pikaui.users WHERE id = $1 AND pin = $2`,
      [userId, pin]
    );

    if (!user) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
    if (!user.is_active) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 });
    }

    const { ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (e) {
    console.error("POST /api/auth/login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
