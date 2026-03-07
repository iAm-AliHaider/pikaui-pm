"""Phase 3 migration: activity_log table + task_dependencies."""
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

    # ── Activity log ────────────────────────────────────────────
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.activity_log (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id  UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
            task_id     UUID REFERENCES pikaui.tasks(id)    ON DELETE SET NULL,
            user_name   TEXT,
            action      TEXT NOT NULL,   -- created | updated | status_changed | hours_logged | commented | milestone_added | sprint_created
            entity_type TEXT NOT NULL,   -- task | project | sprint | milestone | document | timelog
            entity_name TEXT,
            meta        JSONB DEFAULT '{}',
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
    """, "activity_log table")

    await run(conn, "CREATE INDEX IF NOT EXISTS idx_activity_project ON pikaui.activity_log(project_id)", "idx activity.project_id")
    await run(conn, "CREATE INDEX IF NOT EXISTS idx_activity_created ON pikaui.activity_log(created_at DESC)", "idx activity.created_at")

    # ── Task dependencies ────────────────────────────────────────
    await run(conn, """
        CREATE TABLE IF NOT EXISTS pikaui.task_dependencies (
            task_id       UUID REFERENCES pikaui.tasks(id) ON DELETE CASCADE,
            depends_on_id UUID REFERENCES pikaui.tasks(id) ON DELETE CASCADE,
            dependency_type TEXT DEFAULT 'blocks',  -- blocks | relates_to
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (task_id, depends_on_id)
        )
    """, "task_dependencies table")

    # ── Seed activity log (30 realistic entries) ────────────────
    existing = await conn.fetchval("SELECT COUNT(*) FROM pikaui.activity_log")
    if existing == 0:
        import datetime as dt, random, json as _json
        today = dt.date.today()

        tasks    = await conn.fetch("SELECT id, title, project_id, assignee_id FROM pikaui.tasks")
        users    = await conn.fetch("SELECT name FROM pikaui.users")
        projects = await conn.fetch("SELECT id, name FROM pikaui.projects")

        user_names = [u['name'] for u in users]
        actions = [
            ("status_changed", "task", "Moved to in_progress"),
            ("status_changed", "task", "Moved to done"),
            ("hours_logged",   "timelog", "Logged hours"),
            ("updated",        "task", "Updated progress"),
            ("created",        "task", "Created task"),
            ("commented",      "task", "Added comment"),
        ]

        entries = []
        for i in range(30):
            days_back = random.randint(0, 14)
            ts = dt.datetime.combine(today - dt.timedelta(days=days_back),
                                     dt.time(random.randint(8,18), random.randint(0,59)))
            task = random.choice(tasks)
            user = random.choice(user_names)
            action, entity, desc = random.choice(actions)
            meta = {}
            if action == "status_changed":
                meta = {"from": "todo", "to": "in_progress"}
            elif action == "hours_logged":
                meta = {"hours": round(random.uniform(1,6), 1)}
            entries.append((
                task['project_id'], task['id'], user, action,
                entity, task['title'], _json.dumps(meta), ts
            ))

        # Also add milestone and sprint activities
        ms = await conn.fetch("SELECT id, name, project_id FROM pikaui.milestones LIMIT 3")
        for m in ms:
            ts = dt.datetime.combine(today - dt.timedelta(days=random.randint(1,7)),
                                     dt.time(10,0))
            entries.append((
                m['project_id'], None, random.choice(user_names),
                'milestone_added', 'milestone', m['name'], '{}', ts
            ))

        await conn.executemany("""
            INSERT INTO pikaui.activity_log
              (project_id, task_id, user_name, action, entity_type, entity_name, meta, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        """, entries)
        print(f"  ✓ activity_log: seeded {len(entries)} entries")

    # Summary
    counts = await conn.fetchrow("""
        SELECT
          (SELECT COUNT(*) FROM pikaui.activity_log)      as activity,
          (SELECT COUNT(*) FROM pikaui.task_dependencies)  as deps
    """)
    print(f"\nSummary: {counts['activity']} activity entries | {counts['deps']} dependencies")
    await conn.close()

asyncio.run(main())
