"""Final rich seed — uses fully-qualified pikaui.* table names."""
import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    # Clean slate
    await conn.execute("DELETE FROM pikaui.task_comments")
    await conn.execute("DELETE FROM pikaui.documents")
    await conn.execute("DELETE FROM pikaui.tasks")
    await conn.execute("DELETE FROM pikaui.sprints")
    await conn.execute("DELETE FROM pikaui.projects")
    await conn.execute("DELETE FROM pikaui.users")

    # Team
    users = await conn.fetch("""
        INSERT INTO pikaui.users (name, role, department) VALUES
        ('Sarah Chen',     'Lead Developer',    'Engineering'),
        ('Michael Scott',  'Project Manager',   'Management'),
        ('Alex Rivera',    'UI Designer',        'Design'),
        ('Jordan Kim',     'Backend Engineer',   'Engineering'),
        ('Priya Patel',    'QA Engineer',        'Quality')
        RETURNING id, name
    """)
    u = {r['name']: r['id'] for r in users}

    # Projects
    p1 = await conn.fetchrow("""
        INSERT INTO pikaui.projects (name, description, status, color, deadline, manager_id, budget)
        VALUES ('Voice PM App','Voice-first project management with generative UI.','active','#6c5ce7','2026-06-30',$1,85000)
        RETURNING id
    """, u['Michael Scott'])

    p2 = await conn.fetchrow("""
        INSERT INTO pikaui.projects (name, description, status, color, deadline, manager_id, budget)
        VALUES ('Mobile Redesign','Full redesign of the mobile app with new design system.','active','#00b894','2026-05-15',$1,42000)
        RETURNING id
    """, u['Michael Scott'])

    p3 = await conn.fetchrow("""
        INSERT INTO pikaui.projects (name, description, status, color, deadline, manager_id, budget)
        VALUES ('API Gateway','Unified API gateway for microservices architecture.','planning','#fd79a8','2026-08-01',$1,120000)
        RETURNING id
    """, u['Michael Scott'])

    p1_id, p2_id, p3_id = p1['id'], p2['id'], p3['id']

    # Sprints
    await conn.execute("""
        INSERT INTO pikaui.sprints (project_id, name, start_date, end_date, status) VALUES
        ($1,'Sprint 1','2026-02-01','2026-02-14','completed'),
        ($1,'Sprint 2','2026-02-15','2026-02-28','completed'),
        ($1,'Sprint 3','2026-03-01','2026-03-14','active')
    """, p1_id)

    # Tasks for Voice PM App
    tasks1 = [
        ('Implement LiveKit Data Channel',  'in_progress','high',  u['Sarah Chen'],  8, 16, 50, 7, 3),
        ('Setup Neon DB Schema',            'done',       'medium',u['Sarah Chen'],  8,  8,100, 14,0),
        ('Design Kanban Board Widget',      'done',       'medium',u['Alex Rivera'],  8,  8,100, 14,0),
        ('Light Theme Frontend Overhaul',   'in_progress','high',  u['Alex Rivera'],  8, 16, 50, 7, 3),
        ('Free LLM Integration (Gemma)',    'done',       'high',  u['Jordan Kim'],  16, 16,100, 14,0),
        ('Voice Command Testing Suite',     'in_progress','medium',u['Priya Patel'],  4,  8, 50, 7, 3),
        ('Sprint Analytics Widget',         'todo',       'medium',u['Sarah Chen'],   0,  8,  0, 0,10),
        ('Multi-project Support',           'todo',       'low',   u['Jordan Kim'],   0,  4,  0, 0,14),
        ('Deploy to Vercel',                'todo',       'high',  u['Michael Scott'],0, 16,  0, 0, 2),
    ]

    for title, status, priority, assignee, hw, he, pct, days_ago, days_ahead in tasks1:
        await conn.execute("""
            INSERT INTO pikaui.tasks
              (project_id, title, status, priority, assignee_id,
               hours_worked, hours_estimated, progress_pct,
               start_date, due_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
                    CURRENT_DATE - $9 * INTERVAL '1 day',
                    CURRENT_DATE + $10 * INTERVAL '1 day')
        """, p1_id, title, status, priority, assignee, hw, he, pct, days_ago, days_ahead)

    # Tasks for Mobile Redesign
    tasks2 = [
        ('Audit current mobile UX',    'done',       'high',  u['Alex Rivera'],  8, 8, 100, 14,0),
        ('Create new design system',   'in_progress','high',  u['Alex Rivera'],  6,16,  40, 7, 5),
        ('Implement bottom nav',       'in_progress','medium',u['Sarah Chen'],   4, 8,  50, 5, 5),
        ('Dark/light mode toggle',     'todo',       'medium',u['Jordan Kim'],   0, 8,   0, 0, 7),
        ('Performance benchmarking',   'todo',       'low',   u['Priya Patel'],  0, 4,   0, 0,14),
    ]
    for title, status, priority, assignee, hw, he, pct, days_ago, days_ahead in tasks2:
        await conn.execute("""
            INSERT INTO pikaui.tasks
              (project_id, title, status, priority, assignee_id,
               hours_worked, hours_estimated, progress_pct,
               start_date, due_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
                    CURRENT_DATE - $9 * INTERVAL '1 day',
                    CURRENT_DATE + $10 * INTERVAL '1 day')
        """, p2_id, title, status, priority, assignee, hw, he, pct, days_ago, days_ahead)

    # Tasks for API Gateway
    tasks3 = [
        ('Requirements gathering',    'done',       'high',  u['Michael Scott'], 8, 8,100, 14, 0),
        ('Choose gateway framework',  'in_progress','high',  u['Jordan Kim'],    6,16, 40,  7, 5),
        ('Auth middleware design',    'todo',       'high',  u['Jordan Kim'],    0,16,  0,  0, 7),
        ('Rate limiting strategy',    'todo',       'medium',u['Priya Patel'],   0, 8,  0,  0,14),
    ]
    for title, status, priority, assignee, hw, he, pct, days_ago, days_ahead in tasks3:
        await conn.execute("""
            INSERT INTO pikaui.tasks
              (project_id, title, status, priority, assignee_id,
               hours_worked, hours_estimated, progress_pct,
               start_date, due_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
                    CURRENT_DATE - $9 * INTERVAL '1 day',
                    CURRENT_DATE + $10 * INTERVAL '1 day')
        """, p3_id, title, status, priority, assignee, hw, he, pct, days_ago, days_ahead)

    # Documents
    await conn.execute("""
        INSERT INTO pikaui.documents (project_id, name, file_url, file_type, description) VALUES
        ($1,'Technical Specification','https://docs.google.com/document/d/example','doc','Full technical spec including architecture decisions, API contracts, and deployment guide.'),
        ($1,'Sprint 1 Retrospective','https://notion.so/example-retro','doc','Sprint retrospective notes — what went well, blockers, and action items.'),
        ($2,'Mobile UX Audit Report','https://figma.com/example','slide','Comprehensive audit of current mobile UX with screenshots and findings.'),
        ($3,'API Gateway RFC','https://github.com/example/rfc','doc','Request for Comments document for the API Gateway architecture.')
    """, p1_id, p2_id, p3_id)

    # Comments
    task = await conn.fetchrow("SELECT id FROM pikaui.tasks WHERE title ILIKE '%LiveKit%' LIMIT 1")
    if task:
        await conn.execute("""
            INSERT INTO pikaui.task_comments (task_id, author, content) VALUES
            ($1,'Sarah Chen','Data channel working! Messages routing correctly between agent and frontend.'),
            ($1,'Jordan Kim','Make sure we handle the topic filter — only ui_sync topics should trigger renders.')
        """, task['id'])

    # Verify
    counts = await conn.fetchrow("""
        SELECT
          (SELECT COUNT(*) FROM pikaui.users) as users,
          (SELECT COUNT(*) FROM pikaui.projects) as projects,
          (SELECT COUNT(*) FROM pikaui.tasks) as tasks,
          (SELECT COUNT(*) FROM pikaui.sprints) as sprints,
          (SELECT COUNT(*) FROM pikaui.documents) as docs,
          (SELECT COUNT(*) FROM pikaui.task_comments) as comments
    """)
    print(f"Seed complete: {counts['users']} users | {counts['projects']} projects | {counts['tasks']} tasks | {counts['sprints']} sprints | {counts['docs']} docs | {counts['comments']} comments")
    await conn.close()

asyncio.run(main())
