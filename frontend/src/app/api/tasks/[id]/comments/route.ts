import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { author, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  try {
    const [row] = await query(
      "INSERT INTO pikaui.task_comments (task_id, author, content) VALUES ($1,$2,$3) RETURNING *",
      [id, author || "You", content.trim()]
    );
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
