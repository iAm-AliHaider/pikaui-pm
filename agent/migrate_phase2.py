"""Phase 2 migration: time_logs, milestones, sprint_tasks, budget fields."""
import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def run(conn, sql, label):
    try:
        await conn.execute(sql)
        print(f"  ✓ {label}")
    except Exception as e:
        print(f"  ✗ {label}: {e}")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    # ── Users: hourly_rate ─────────────────────────────────────────
    await run(conn, "ALTER TABLE pikaui.users ADD COLUMN IF NOT EXISTS hourly_rate FLOAT DEFAULT 75", "users.hourly_rate")

    # ── Sprint tasks junction (tracks which tasks belong to sprint) ─
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.sprint_tasks (
            sprint_id UUID REFERENCES pikaui.sprints(id) ON DELETE CASCADE,
            task_id   UUID REFERENCES pikaui.tasks(id)   ON DELETE CASCADE,
            added_at  TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (sprint_id, task_id)
        )
    """, "sprint_tasks junction table")

    # ── Time logs: daily hour entries per user per task ─────────────
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.time_logs (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id    UUID REFERENCES pikaui.tasks(id)    ON DELETE SET NULL,
            project_id UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
            user_id    UUID REFERENCES pikaui.users(id)    ON DELETE SET NULL,
            hours      FLOAT NOT NULL DEFAULT 0,
            log_date   DATE NOT NULL DEFAULT CURRENT_DATE,
            note       TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """, "time_logs table")

    await run(conn, "CREATE INDEX IF NOT EXISTS idx_time_logs_date    ON pikaui.time_logs(log_date)", "idx time_logs.log_date")
    await run(conn, "CREATE INDEX IF NOT EXISTS idx_time_logs_user    ON pikaui.time_logs(user_id)", "idx time_logs.user_id")
    await run(conn, "CREATE INDEX IF NOT EXISTS idx_time_logs_project ON pikaui.time_logs(project_id)", "idx time_logs.project_id")

    # ── Milestones ──────────────────────────────────────────────────
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.milestones (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id  UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            description TEXT,
            due_date    DATE,
            status      TEXT DEFAULT 'pending',   -- pending | achieved | missed
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """, "milestones table")

    # ── Risks log (auto-detected, can be dismissed) ─────────────────
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.risks (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id  UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
            risk_type   TEXT NOT NULL,   -- overdue | overloaded | budget | velocity
            severity    TEXT DEFAULT 'medium',  -- low | medium | high
            title       TEXT NOT NULL,
            detail      TEXT,
            dismissed   BOOLEAN DEFAULT FALSE,
            detected_at TIMESTAMPTZ DEFAULT NOW()
        )
    """, "risks table")

    # ── Seed sprint_tasks (link existing tasks to sprints) ──────────
    sprint3 = await conn.fetchrow("SELECT id FROM pikaui.sprints WHERE name='Sprint 3' LIMIT 1")
    if sprint3:
        tasks = await conn.fetch("SELECT id FROM pikaui.tasks WHERE status IN ('in_progress','todo') LIMIT 8")
        for t in tasks:
            await conn.execute("""
                INSERT INTO pikaui.sprint_tasks (sprint_id, task_id)
                VALUES ($1, $2) ON CONFLICT DO NOTHING
            """, sprint3['id'], t['id'])
        print(f"  ✓ sprint_tasks: linked {len(tasks)} tasks to Sprint 3")

    # ── Seed time_logs (30 days of history) ────────────────────────
    users    = await conn.fetch("SELECT id FROM pikaui.users")
    tasks_all= await conn.fetch("SELECT id, project_id, assignee_id FROM pikaui.tasks WHERE assignee_id IS NOT NULL")
    projs    = await conn.fetch("SELECT id FROM pikaui.projects")

    existing = await conn.fetchval("SELECT COUNT(*) FROM pikaui.time_logs")
    if existing == 0:
        import random, datetime as dt
        today = dt.date.today()
        entries = []
        for task in tasks_all:
            for days_back in range(14, -1, -1):
                log_date = today - dt.timedelta(days=days_back)
                if log_date.weekday() >= 5:  # skip weekends
                    continue
                hours = round(random.uniform(0.5, 6.0) * 2) / 2  # 0.5-6h in 0.5 steps
                entries.append((task['id'], task['project_id'], task['assignee_id'], hours, log_date))
        await conn.executemany("""
            INSERT INTO pikaui.time_logs (task_id, project_id, user_id, hours, log_date)
            VALUES ($1, $2, $3, $4, $5)
        """, entries)
        print(f"  ✓ time_logs: seeded {len(entries)} entries (15 working days)")

    # ── Seed milestones ────────────────────────────────────────────
    p1 = await conn.fetchrow("SELECT id FROM pikaui.projects WHERE name='Voice PM App'")
    p2 = await conn.fetchrow("SELECT id FROM pikaui.projects WHERE name='Mobile Redesign'")
    if p1:
        existing = await conn.fetchval("SELECT COUNT(*) FROM pikaui.milestones WHERE project_id=$1", p1['id'])
        if existing == 0:
            await conn.execute("""
                INSERT INTO pikaui.milestones (project_id, name, due_date, status) VALUES
                ($1,'Alpha Release','2026-03-20','pending'),
                ($1,'Beta Launch','2026-04-15','pending'),
                ($1,'Production v1.0','2026-06-30','pending')
            """, p1['id'])
            print("  ✓ milestones seeded for Voice PM App")
    if p2:
        existing = await conn.fetchval("SELECT COUNT(*) FROM pikaui.milestones WHERE project_id=$1", p2['id'])
        if existing == 0:
            await conn.execute("""
                INSERT INTO pikaui.milestones (project_id, name, due_date, status) VALUES
                ($1,'Design Review','2026-03-15','pending'),
                ($1,'Dev Handoff','2026-04-01','pending')
            """, p2['id'])
            print("  ✓ milestones seeded for Mobile Redesign")

    # ── Update hourly rates ────────────────────────────────────────
    await conn.execute("UPDATE pikaui.users SET hourly_rate=120 WHERE name='Sarah Chen'")
    await conn.execute("UPDATE pikaui.users SET hourly_rate=95  WHERE name='Michael Scott'")
    await conn.execute("UPDATE pikaui.users SET hourly_rate=100 WHERE name='Alex Rivera'")
    await conn.execute("UPDATE pikaui.users SET hourly_rate=110 WHERE name='Jordan Kim'")
    await conn.execute("UPDATE pikaui.users SET hourly_rate=85  WHERE name='Priya Patel'")
    print("  ✓ hourly rates set")

    # Summary
    counts = await conn.fetchrow("""
        SELECT
          (SELECT COUNT(*) FROM pikaui.time_logs)   as timelogs,
          (SELECT COUNT(*) FROM pikaui.milestones)   as milestones,
          (SELECT COUNT(*) FROM pikaui.sprint_tasks) as sprint_tasks,
          (SELECT COUNT(*) FROM pikaui.risks)        as risks
    """)
    print(f"\nSummary: {counts['timelogs']} time_logs | {counts['milestones']} milestones | {counts['sprint_tasks']} sprint_tasks | {counts['risks']} risks")
    await conn.close()

asyncio.run(main())
