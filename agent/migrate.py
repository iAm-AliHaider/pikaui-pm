"""DB migration: extend pikaui PM schema with full PM fields."""
import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def main():
    conn = await asyncpg.connect(DATABASE_URL, server_settings={"search_path": "pikaui"})

    print("Running migrations...")

    # ── Extend tasks ──────────────────────────────────
    await conn.execute("""
        ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS start_date DATE,
            ADD COLUMN IF NOT EXISTS due_date DATE,
            ADD COLUMN IF NOT EXISTS hours_estimated FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS hours_worked FLOAT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100)
    """)
    print("  tasks: extended ✓")

    # ── Extend projects ───────────────────────────────
    await conn.execute("""
        ALTER TABLE projects
            ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS deadline DATE,
            ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6c5ce7',
            ADD COLUMN IF NOT EXISTS budget FLOAT DEFAULT 0
    """)
    print("  projects: extended ✓")

    # ── Extend users ──────────────────────────────────
    await conn.execute("""
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email TEXT,
            ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#6c5ce7',
            ADD COLUMN IF NOT EXISTS department TEXT
    """)
    print("  users: extended ✓")

    # ── Documents table ───────────────────────────────
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            file_url TEXT,
            file_type TEXT DEFAULT 'other',
            file_size INTEGER DEFAULT 0,
            description TEXT,
            qdrant_indexed BOOLEAN DEFAULT FALSE,
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    print("  documents: created ✓")

    # ── Task comments table ────────────────────────────
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS task_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    print("  task_comments: created ✓")

    # ── Update seed data with richer details ──────────
    # Set managers
    michael = await conn.fetchrow("SELECT id FROM users WHERE name ILIKE '%michael%'")
    if michael:
        await conn.execute("UPDATE projects SET manager_id=$1 WHERE manager_id IS NULL", michael['id'])

    # Set project colors + deadlines
    await conn.execute("UPDATE projects SET color='#6c5ce7', deadline='2026-06-30' WHERE name='Voice PM App'")
    await conn.execute("UPDATE projects SET color='#00b894', deadline='2026-05-15' WHERE name='Mobile Redesign'")
    await conn.execute("UPDATE projects SET color='#fd79a8', deadline='2026-08-01' WHERE name='API Gateway'")

    # Set task details
    await conn.execute("""
        UPDATE tasks SET
            hours_estimated = CASE priority
                WHEN 'high' THEN 16
                WHEN 'medium' THEN 8
                ELSE 4
            END,
            hours_worked = CASE status
                WHEN 'done' THEN CASE priority WHEN 'high' THEN 16 WHEN 'medium' THEN 8 ELSE 4 END
                WHEN 'in_progress' THEN CASE priority WHEN 'high' THEN 8 WHEN 'medium' THEN 4 ELSE 2 END
                ELSE 0
            END,
            progress_pct = CASE status
                WHEN 'done' THEN 100
                WHEN 'in_progress' THEN 50
                ELSE 0
            END,
            start_date = CURRENT_DATE - INTERVAL '7 days',
            due_date = CASE priority
                WHEN 'high' THEN CURRENT_DATE + INTERVAL '3 days'
                WHEN 'medium' THEN CURRENT_DATE + INTERVAL '7 days'
                ELSE CURRENT_DATE + INTERVAL '14 days'
            END
        WHERE start_date IS NULL
    """)
    print("  seed data: enriched ✓")

    # ── Seed a document for completed project ─────────
    proj = await conn.fetchrow("SELECT id FROM projects WHERE name='Voice PM App'")
    if proj:
        await conn.execute("""
            INSERT INTO documents (project_id, name, file_url, file_type, description)
            VALUES ($1, 'Voice PM App — Technical Spec', 'https://docs.google.com/document/d/example', 'doc', 'Full technical specification including architecture decisions, API contracts, and deployment guide.')
            ON CONFLICT DO NOTHING
        """, proj['id'])
        await conn.execute("""
            INSERT INTO documents (project_id, name, file_url, file_type, description)
            VALUES ($1, 'Sprint 1 Retrospective', 'https://notion.so/example-retro', 'doc', 'Sprint 1 retrospective notes — what went well, blockers, and action items.')
            ON CONFLICT DO NOTHING
        """, proj['id'])
    print("  documents: seeded ✓")

    # ── Seed comments ─────────────────────────────────
    task = await conn.fetchrow("SELECT id FROM tasks WHERE title ILIKE '%LiveKit%'")
    if task:
        await conn.execute("""
            INSERT INTO task_comments (task_id, author, content)
            VALUES ($1, 'Sarah Chen', 'Data channel working! Messages routing correctly between agent and frontend.')
            ON CONFLICT DO NOTHING
        """, task['id'])

    print("\nAll migrations complete ✓")
    await conn.close()

asyncio.run(main())
