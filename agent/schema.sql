-- Project Management App Schema for Neon DB

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo', -- todo, in_progress, done
    priority TEXT DEFAULT 'medium', -- low, medium, high
    assignee_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints/Analytics data (Simplified)
CREATE TABLE sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'planned'
);

-- Sample Data
INSERT INTO users (name, role) VALUES 
('Sarah Chen', 'Lead Dev'),
('Michael Scott', 'Project Manager'),
('Alex Rivera', 'UI Designer');

INSERT INTO projects (name, description) VALUES 
('Voice PM App', 'Building a voice-first project management application.');

-- Tasks for Sarah
INSERT INTO tasks (project_id, title, status, priority, assignee_id) 
SELECT p.id, 'Implement LiveKit Data Channel', 'in_progress', 'high', u.id 
FROM projects p, users u WHERE p.name = 'Voice PM App' AND u.name = 'Sarah Chen';

INSERT INTO tasks (project_id, title, status, priority, assignee_id) 
SELECT p.id, 'Setup Neon DB Schema', 'done', 'medium', u.id 
FROM projects p, users u WHERE p.name = 'Voice PM App' AND u.name = 'Sarah Chen';

-- Tasks for Alex
INSERT INTO tasks (project_id, title, status, priority, assignee_id) 
SELECT p.id, 'Design Glassmorphism Components', 'in_progress', 'medium', u.id 
FROM projects p, users u WHERE p.name = 'Voice PM App' AND u.name = 'Alex Rivera';
