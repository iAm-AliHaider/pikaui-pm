"""Setup pikaui schema in Neon DB (separate from Taliq's tables)"""
import psycopg2, os

DB = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(DB)
conn.autocommit = True
cur = conn.cursor()

cur.execute("CREATE SCHEMA IF NOT EXISTS pikaui")
print("Schema pikaui: ready")

cur.execute("""
CREATE TABLE IF NOT EXISTS pikaui.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, role TEXT, avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
)""")

cur.execute("""
CREATE TABLE IF NOT EXISTS pikaui.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, description TEXT, status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
)""")

cur.execute("""
CREATE TABLE IF NOT EXISTS pikaui.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT,
    status TEXT DEFAULT 'todo', priority TEXT DEFAULT 'medium',
    assignee_id UUID REFERENCES pikaui.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
)""")

cur.execute("""
CREATE TABLE IF NOT EXISTS pikaui.sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pikaui.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL, start_date DATE, end_date DATE,
    status TEXT DEFAULT 'planned'
)""")
print("Tables: created")

cur.execute("SELECT COUNT(*) FROM pikaui.users")
if cur.fetchone()[0] == 0:
    cur.execute("INSERT INTO pikaui.users (name, role) VALUES ('Sarah Chen','Lead Dev'),('Michael Scott','Project Manager'),('Alex Rivera','UI Designer')")
    cur.execute("INSERT INTO pikaui.projects (name, description) VALUES ('Voice PM App','Building a voice-first PM application')")
    cur.execute("""INSERT INTO pikaui.tasks (project_id, title, status, priority, assignee_id)
        SELECT p.id,'Implement LiveKit Data Channel','in_progress','high',u.id
        FROM pikaui.projects p, pikaui.users u WHERE u.name='Sarah Chen'""")
    cur.execute("""INSERT INTO pikaui.tasks (project_id, title, status, priority, assignee_id)
        SELECT p.id,'Setup Neon DB Schema','done','medium',u.id
        FROM pikaui.projects p, pikaui.users u WHERE u.name='Sarah Chen'""")
    cur.execute("""INSERT INTO pikaui.tasks (project_id, title, status, priority, assignee_id)
        SELECT p.id,'Design Glassmorphism Components','in_progress','medium',u.id
        FROM pikaui.projects p, pikaui.users u WHERE u.name='Alex Rivera'""")
    cur.execute("""INSERT INTO pikaui.tasks (project_id, title, status, priority, assignee_id)
        SELECT p.id,'Write API Documentation','todo','low',u.id
        FROM pikaui.projects p, pikaui.users u WHERE u.name='Michael Scott'""")
    print("Seed data: inserted")

cur.execute("SELECT COUNT(*) FROM pikaui.tasks")
print(f"Tasks in DB: {cur.fetchone()[0]}")
cur.execute("SELECT title, status, priority FROM pikaui.tasks ORDER BY created_at")
for row in cur.fetchall():
    print(f"  - {row[0]} | {row[1]} | {row[2]}")
conn.close()
print("Done!")
