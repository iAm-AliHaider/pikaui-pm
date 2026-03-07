"""Add richer seed data to pikaui PM schema."""
import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def main():
    conn = await asyncpg.connect(DATABASE_URL, server_settings={"search_path": "pikaui"})

    # Clear and re-seed
    await conn.execute("DELETE FROM tasks")
    await conn.execute("DELETE FROM sprints")
    await conn.execute("DELETE FROM projects")
    await conn.execute("DELETE FROM users")

    # Team members
    users = await conn.fetch("""
        INSERT INTO users (name, role) VALUES
        ('Sarah Chen', 'Lead Developer'),
        ('Michael Scott', 'Project Manager'),
        ('Alex Rivera', 'UI Designer'),
        ('Jordan Kim', 'Backend Engineer'),
        ('Priya Patel', 'QA Engineer')
        RETURNING id, name
    """)
    u = {r['name']: r['id'] for r in users}

    # Projects
    p1 = await conn.fetchrow("INSERT INTO projects (name, description, status) VALUES ('Voice PM App', 'Voice-first project management tool with generative UI.', 'active') RETURNING id")
    p2 = await conn.fetchrow("INSERT INTO projects (name, description, status) VALUES ('Mobile Redesign', 'Full redesign of the mobile app with new design system.', 'active') RETURNING id")
    p3 = await conn.fetchrow("INSERT INTO projects (name, description, status) VALUES ('API Gateway', 'Unified API gateway for microservices architecture.', 'planning') RETURNING id")

    p1_id = p1['id']
    p2_id = p2['id']
    p3_id = p3['id']

    # Sprints
    s1 = await conn.fetchrow("INSERT INTO sprints (project_id, name, start_date, end_date, status) VALUES ($1, 'Sprint 1', '2026-02-01', '2026-02-14', 'completed') RETURNING id", p1_id)
    s2 = await conn.fetchrow("INSERT INTO sprints (project_id, name, start_date, end_date, status) VALUES ($1, 'Sprint 2', '2026-02-15', '2026-02-28', 'completed') RETURNING id", p1_id)
    s3 = await conn.fetchrow("INSERT INTO sprints (project_id, name, start_date, end_date, status) VALUES ($1, 'Sprint 3', '2026-03-01', '2026-03-14', 'active') RETURNING id", p1_id)

    # Tasks for Voice PM App
    await conn.executemany("""
        INSERT INTO tasks (project_id, title, status, priority, assignee_id) VALUES ($1, $2, $3, $4, $5)
    """, [
        (p1_id, 'Implement LiveKit Data Channel', 'done', 'high', u['Sarah Chen']),
        (p1_id, 'Setup Neon DB Schema', 'done', 'medium', u['Sarah Chen']),
        (p1_id, 'Design Kanban Board Widget', 'done', 'medium', u['Alex Rivera']),
        (p1_id, 'Free LLM Integration (Gemma)', 'in_progress', 'high', u['Jordan Kim']),
        (p1_id, 'Light Theme Frontend Overhaul', 'in_progress', 'high', u['Alex Rivera']),
        (p1_id, 'Voice Command Testing Suite', 'in_progress', 'medium', u['Priya Patel']),
        (p1_id, 'Sprint Analytics Widget', 'todo', 'medium', u['Sarah Chen']),
        (p1_id, 'Multi-project Support', 'todo', 'low', u['Jordan Kim']),
        (p1_id, 'Deploy to Vercel', 'todo', 'high', u['Michael Scott']),
    ])

    # Tasks for Mobile Redesign
    await conn.executemany("""
        INSERT INTO tasks (project_id, title, status, priority, assignee_id) VALUES ($1, $2, $3, $4, $5)
    """, [
        (p2_id, 'Audit current mobile UX', 'done', 'high', u['Alex Rivera']),
        (p2_id, 'Create new design system', 'in_progress', 'high', u['Alex Rivera']),
        (p2_id, 'Implement bottom nav', 'in_progress', 'medium', u['Sarah Chen']),
        (p2_id, 'Dark/light mode toggle', 'todo', 'medium', u['Jordan Kim']),
        (p2_id, 'Performance benchmarking', 'todo', 'low', u['Priya Patel']),
    ])

    # Tasks for API Gateway
    await conn.executemany("""
        INSERT INTO tasks (project_id, title, status, priority, assignee_id) VALUES ($1, $2, $3, $4, $5)
    """, [
        (p3_id, 'Requirements gathering', 'done', 'high', u['Michael Scott']),
        (p3_id, 'Choose gateway framework', 'in_progress', 'high', u['Jordan Kim']),
        (p3_id, 'Auth middleware design', 'todo', 'high', u['Jordan Kim']),
        (p3_id, 'Rate limiting strategy', 'todo', 'medium', u['Priya Patel']),
    ])

    print("Seed complete!")
    counts = await conn.fetchrow("SELECT (SELECT COUNT(*) FROM users) as u, (SELECT COUNT(*) FROM projects) as p, (SELECT COUNT(*) FROM tasks) as t, (SELECT COUNT(*) FROM sprints) as s")
    print(f"Users: {counts['u']}, Projects: {counts['p']}, Tasks: {counts['t']}, Sprints: {counts['s']}")
    await conn.close()

asyncio.run(main())
