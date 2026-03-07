"""Fix schema — run each ALTER TABLE explicitly and verify."""
import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def run_ddl(conn, sql, label):
    try:
        await conn.execute(sql)
        print(f"  ✓ {label}")
    except Exception as e:
        print(f"  ✗ {label}: {e}")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)  # no search_path — use fully qualified names
    print("Connected\n")

    # ── Extend pikaui.projects ────────────────────────
    await run_ddl(conn, "ALTER TABLE pikaui.projects ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES pikaui.users(id)", "projects.manager_id")
    await run_ddl(conn, "ALTER TABLE pikaui.projects ADD COLUMN IF NOT EXISTS deadline DATE", "projects.deadline")
    await run_ddl(conn, "ALTER TABLE pikaui.projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6c5ce7'", "projects.color")
    await run_ddl(conn, "ALTER TABLE pikaui.projects ADD COLUMN IF NOT EXISTS budget FLOAT DEFAULT 0", "projects.budget")

    # ── Extend pikaui.tasks ───────────────────────────
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS description TEXT", "tasks.description")
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS start_date DATE", "tasks.start_date")
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS due_date DATE", "tasks.due_date")
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS hours_estimated FLOAT DEFAULT 0", "tasks.hours_estimated")
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS hours_worked FLOAT DEFAULT 0", "tasks.hours_worked")
    await run_ddl(conn, "ALTER TABLE pikaui.tasks ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0", "tasks.progress_pct")

    # ── Extend pikaui.users ───────────────────────────
    await run_ddl(conn, "ALTER TABLE pikaui.users ADD COLUMN IF NOT EXISTS email TEXT", "users.email")
    await run_ddl(conn, "ALTER TABLE pikaui.users ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#6c5ce7'", "users.avatar_color")
    await run_ddl(conn, "ALTER TABLE pikaui.users ADD COLUMN IF NOT EXISTS department TEXT", "users.department")

    # ── New tables ─────────────────────────────────────
    await run_ddl(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            file_url TEXT,
            file_type TEXT DEFAULT 'other',
            file_size INTEGER DEFAULT 0,
            description TEXT,
            qdrant_indexed BOOLEAN DEFAULT FALSE,
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        )
    """, "documents table")

    await run_ddl(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.task_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID REFERENCES pikaui.tasks(id) ON DELETE CASCADE,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """, "task_comments table")

    print("\nVerifying projects columns...")
    cols = await conn.fetch("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='pikaui' AND table_name='projects'
        ORDER BY ordinal_position
    """)
    print("  " + ", ".join(c['column_name'] for c in cols))

    print("Verifying tasks columns...")
    cols = await conn.fetch("""
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='pikaui' AND table_name='tasks'
        ORDER BY ordinal_position
    """)
    print("  " + ", ".join(c['column_name'] for c in cols))

    # ── Update seed data ───────────────────────────────
    print("\nUpdating seed data...")
    michael = await conn.fetchrow("SELECT id FROM pikaui.users WHERE name ILIKE '%michael%'")
    if michael:
        await conn.execute("UPDATE pikaui.projects SET manager_id=$1 WHERE manager_id IS NULL", michael['id'])
        print("  ✓ managers set")

    await conn.execute("UPDATE pikaui.projects SET color='#6c5ce7', deadline='2026-06-30' WHERE name='Voice PM App'")
    await conn.execute("UPDATE pikaui.projects SET color='#00b894', deadline='2026-05-15' WHERE name='Mobile Redesign'")
    await conn.execute("UPDATE pikaui.projects SET color='#fd79a8', deadline='2026-08-01' WHERE name='API Gateway'")
    print("  ✓ project colors/deadlines set")

    await conn.execute("""
        UPDATE pikaui.tasks SET
            hours_estimated = CASE priority WHEN 'high' THEN 16 WHEN 'medium' THEN 8 ELSE 4 END,
            hours_worked = CASE status
                WHEN 'done' THEN CASE priority WHEN 'high' THEN 16 WHEN 'medium' THEN 8 ELSE 4 END
                WHEN 'in_progress' THEN CASE priority WHEN 'high' THEN 8 WHEN 'medium' THEN 4 ELSE 2 END
                ELSE 0 END,
            progress_pct = CASE status WHEN 'done' THEN 100 WHEN 'in_progress' THEN 50 ELSE 0 END,
            start_date = CURRENT_DATE - INTERVAL '7 days',
            due_date = CASE priority
                WHEN 'high' THEN CURRENT_DATE + INTERVAL '3 days'
                WHEN 'medium' THEN CURRENT_DATE + INTERVAL '7 days'
                ELSE CURRENT_DATE + INTERVAL '14 days' END
        WHERE hours_estimated = 0 OR hours_estimated IS NULL
    """)
    print("  ✓ task details set")

    # Seed docs
    proj = await conn.fetchrow("SELECT id FROM pikaui.projects WHERE name='Voice PM App'")
    if proj:
        r = await conn.fetchrow("SELECT id FROM pikaui.documents WHERE project_id=$1 LIMIT 1", proj['id'])
        if not r:
            await conn.execute("""
                INSERT INTO pikaui.documents (project_id, name, file_url, file_type, description)
                VALUES ($1,'Technical Spec','https://docs.google.com/document/d/example','doc','Full technical spec including architecture decisions and API contracts.'),
                       ($1,'Sprint 1 Retro','https://notion.so/example-retro','doc','Sprint retrospective notes — what went well, blockers, and action items.')
            """, proj['id'])
            print("  ✓ documents seeded")

    print("\nAll done ✓")
    await conn.close()

asyncio.run(main())
