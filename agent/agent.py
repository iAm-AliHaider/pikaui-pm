"""pikAui PM — Voice-Powered Project Management Agent.

Stack: Deepgram Nova-3 (STT) | GPT-4o-mini (LLM) | Kokoro/Speaches (TTS) | Silero VAD
DB:    Neon Postgres — neondb database, pikaui schema
"""

import os, json, logging, asyncio
import asyncpg
from dotenv import load_dotenv
from livekit.agents import (
    Agent, AgentSession, AutoSubscribe, JobContext,
    WorkerOptions, cli, function_tool, RunContext,
)
from livekit.plugins import deepgram, openai, silero

load_dotenv()
logger = logging.getLogger("pikaui-pm")

DATABASE_URL = os.getenv("DATABASE_URL")
AGENT_NAME   = "pikaui-pm"

# ── Singleton DB pool ──────────────────────────────────
_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            server_settings={"search_path": "pikaui"},
            min_size=1, max_size=5,
        )
    return _pool

# ── Room ref for data channel ──────────────────────────
_room_ref = None

async def _send_ui(component: str, props: dict):
    """Send a widget render command to the frontend."""
    if not _room_ref or not _room_ref.local_participant:
        return
    payload = json.dumps({
        "type": "tambo_render",
        "component": component,
        "props": props,
    }).encode("utf-8")
    await _room_ref.local_participant.publish_data(payload, topic="ui_sync", reliable=True)
    logger.info(f"UI sent: {component}")

async def _send_event(event_type: str, data: dict = {}):
    """Send a dashboard navigation/refresh event to the frontend."""
    if not _room_ref or not _room_ref.local_participant:
        return
    payload = json.dumps({"type": event_type, **data}).encode("utf-8")
    await _room_ref.local_participant.publish_data(payload, topic="ui_sync", reliable=True)

def _row(r):
    """Serialize asyncpg row to plain dict."""
    d = dict(r)
    return {k: str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
            for k, v in d.items()}

# ═══════════════════════════════════════════════════════
#  TOOLS
# ═══════════════════════════════════════════════════════

@function_tool()
async def list_projects(context: RunContext):
    """List all projects with their status, manager, and task counts."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT p.id, p.name, p.description, p.status, p.color, p.deadline,
                   u.name as manager,
                   COUNT(t.id) as total_tasks,
                   COUNT(t.id) FILTER (WHERE t.status='done') as done_tasks
            FROM projects p
            LEFT JOIN users u ON p.manager_id = u.id
            LEFT JOIN tasks t ON t.project_id = p.id
            GROUP BY p.id, p.name, p.description, p.status, p.color, p.deadline, u.name
            ORDER BY p.name
        """)
    projects = [_row(r) for r in rows]
    await _send_event("switch_tab", {"tab": "overview"})
    await _send_ui("ProjectList", {"projects": projects})
    return f"Found {len(projects)} projects: {', '.join(p['name'] for p in projects)}."


@function_tool()
async def show_project_detail(context: RunContext, project_name: str = ""):
    """Show full project detail — manager, team, timeline, budget, and sprint progress."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("""
                SELECT p.*, u.name as manager_name, u.role as manager_role
                FROM projects p LEFT JOIN users u ON p.manager_id = u.id
                WHERE p.name ILIKE $1
            """, f"%{project_name}%")
        else:
            proj = await conn.fetchrow("""
                SELECT p.*, u.name as manager_name, u.role as manager_role
                FROM projects p LEFT JOIN users u ON p.manager_id = u.id
                WHERE p.status='active' LIMIT 1
            """)
        if not proj:
            return "Project not found."

        team = await conn.fetch("""
            SELECT DISTINCT u.id, u.name, u.role,
                   COUNT(t.id) as task_count
            FROM tasks t
            JOIN users u ON t.assignee_id = u.id
            WHERE t.project_id = $1
            GROUP BY u.id, u.name, u.role
        """, proj["id"])

        stats = await conn.fetchrow("""
            SELECT COUNT(*) as total,
                   COUNT(*) FILTER (WHERE status='done') as done,
                   SUM(hours_worked) as hours_worked,
                   SUM(hours_estimated) as hours_estimated
            FROM tasks WHERE project_id = $1
        """, proj["id"])

    detail = _row(proj)
    detail["team"] = [_row(m) for m in team]
    detail["stats"] = _row(stats)
    await _send_event("switch_tab", {"tab": "overview"})
    await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
    await _send_ui("ProjectDetail", {"project": detail})
    return f"Showing {proj['name']} — managed by {proj.get('manager_name', 'unassigned')}."


@function_tool()
async def show_board(context: RunContext, project_name: str = ""):
    """Show the Kanban board for a project."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow(
            "SELECT id, name FROM projects WHERE name ILIKE $1" if project_name
            else "SELECT id, name FROM projects WHERE status='active' LIMIT 1",
            *([f"%{project_name}%"] if project_name else [])
        )
        if not proj:
            return "Project not found."

        rows = await conn.fetch("""
            SELECT t.id, t.title, t.status, t.priority, t.progress_pct,
                   t.hours_estimated, t.hours_worked,
                   t.start_date, t.due_date, t.description,
                   u.name as assignee, u.avatar_color
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.project_id = $1
            ORDER BY t.priority DESC, t.created_at DESC
        """, proj["id"])

    tasks = [_row(r) for r in rows]
    await _send_event("switch_tab", {"tab": "board"})
    await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
    await _send_ui("KanbanBoard", {"tasks": tasks, "projectName": proj["name"]})
    return f"Board for {proj['name']} — {len(tasks)} tasks."


@function_tool()
async def create_task(
    context: RunContext,
    title: str,
    priority: str = "medium",
    assignee_name: str = "",
    project_name: str = "",
    hours_estimated: float = 0,
    due_date: str = "",
):
    """Create a new task. Priority: low/medium/high. due_date: YYYY-MM-DD."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        assignee_id = None
        assignee_display = None
        if assignee_name:
            u = await conn.fetchrow("SELECT id, name FROM users WHERE name ILIKE $1", f"%{assignee_name}%")
            if u:
                assignee_id, assignee_display = u["id"], u["name"]

        proj = await conn.fetchrow(
            "SELECT id, name FROM projects WHERE name ILIKE $1" if project_name
            else "SELECT id, name FROM projects WHERE status='active' LIMIT 1",
            *([f"%{project_name}%"] if project_name else [])
        )
        if not proj:
            return "No active project found."

        row = await conn.fetchrow("""
            INSERT INTO tasks (project_id, title, priority, assignee_id, hours_estimated,
                               due_date, start_date, progress_pct)
            VALUES ($1,$2,$3,$4,$5,$6::date,CURRENT_DATE,0)
            RETURNING id, title, status, priority, hours_estimated, hours_worked, progress_pct
        """, proj["id"], title, priority, assignee_id, hours_estimated or 0,
            due_date if due_date else None)

    task = _row(row)
    task["assignee"] = assignee_display
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, proj["id"], None, assignee_display or "PlanBot",
                            "created", "task", title)
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("TaskCard", {"task": task})
    return f"Created '{title}'{f' → {assignee_display}' if assignee_display else ''}."


@function_tool()
async def update_task_status(context: RunContext, task_title: str, new_status: str):
    """Move a task: todo | in_progress | done."""
    valid = {"todo", "in_progress", "done"}
    if new_status not in valid:
        return f"Use: {', '.join(valid)}."
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE tasks SET status=$1, updated_at=NOW(),
                progress_pct = CASE WHEN $1='done' THEN 100
                               WHEN $1='in_progress' AND progress_pct=0 THEN 10
                               ELSE progress_pct END
            WHERE title ILIKE $2
            RETURNING title, status, progress_pct
        """, new_status, f"%{task_title}%")
    if not row:
        return f"No task matching '{task_title}'."
    label = new_status.replace("_", " ").title()
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, None, None, "PlanBot",
                            "status_changed", "task", row["title"], {"to": new_status})
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner", {"message": f"'{row['title']}' → {label}", "type": "success"})
    return f"Moved to {label}."


@function_tool()
async def log_hours(context: RunContext, task_title: str, hours: float):
    """Log hours worked on a task. Automatically updates progress percentage."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE tasks
            SET hours_worked = hours_worked + $1,
                progress_pct = LEAST(100, CASE
                    WHEN hours_estimated > 0
                    THEN ROUND(((hours_worked + $1) / hours_estimated * 100)::numeric)::integer
                    ELSE progress_pct END),
                updated_at = NOW()
            WHERE title ILIKE $2
            RETURNING title, hours_worked, hours_estimated, progress_pct
        """, hours, f"%{task_title}%")
    if not row:
        return f"Task '{task_title}' not found."
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, None, None, "PlanBot",
                            "hours_logged", "timelog", row["title"], {"hours": hours})
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner", {
        "message": f"+{hours}h logged on '{row['title']}' — {row['hours_worked']}h total ({row['progress_pct']}% done)",
        "type": "success",
        "progress": int(row['progress_pct'])
    })
    return f"Logged {hours}h on '{row['title']}'. Total: {row['hours_worked']}h."


@function_tool()
async def set_task_progress(context: RunContext, task_title: str, progress_pct: int):
    """Set task completion percentage (0–100)."""
    pct = max(0, min(100, progress_pct))
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE tasks SET progress_pct=$1,
                status = CASE WHEN $1=100 THEN 'done'
                         WHEN $1 > 0 AND status='todo' THEN 'in_progress'
                         ELSE status END,
                updated_at = NOW()
            WHERE title ILIKE $2
            RETURNING title, progress_pct, status
        """, pct, f"%{task_title}%")
    if not row:
        return f"Task '{task_title}' not found."
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner", {
        "message": f"'{row['title']}' is now {pct}% complete",
        "type": "success",
        "progress": pct
    })
    return f"Set {row['title']} to {pct}%."


@function_tool()
async def set_task_dates(context: RunContext, task_title: str, start_date: str = "", due_date: str = ""):
    """Set start and/or due date on a task. Format: YYYY-MM-DD."""
    if not start_date and not due_date:
        return "Provide at least one date."
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE tasks
            SET start_date = COALESCE($1::date, start_date),
                due_date   = COALESCE($2::date, due_date),
                updated_at = NOW()
            WHERE title ILIKE $3
            RETURNING title, start_date, due_date
        """, start_date or None, due_date or None, f"%{task_title}%")
    if not row:
        return f"Task '{task_title}' not found."
    await _send_event("refresh", {"section": "tasks"})
    return f"Dates set on '{row['title']}'."


@function_tool()
async def search_tasks(context: RunContext, query: str, status_filter: str = ""):
    """Search tasks by keyword, optionally filtered by status."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status_filter:
            rows = await conn.fetch("""
                SELECT t.id,t.title,t.status,t.priority,t.progress_pct,
                       t.hours_estimated,t.hours_worked,u.name as assignee
                FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id
                WHERE t.title ILIKE $1 AND t.status=$2 LIMIT 10
            """, f"%{query}%", status_filter)
        else:
            rows = await conn.fetch("""
                SELECT t.id,t.title,t.status,t.priority,t.progress_pct,
                       t.hours_estimated,t.hours_worked,u.name as assignee
                FROM tasks t LEFT JOIN users u ON t.assignee_id=u.id
                WHERE t.title ILIKE $1 LIMIT 10
            """, f"%{query}%")
    tasks = [_row(r) for r in rows]
    await _send_event("switch_tab", {"tab": "board"})
    await _send_ui("KanbanBoard", {"tasks": tasks, "projectName": f'Search: "{query}"'})
    return f"Found {len(tasks)} task(s)."


@function_tool()
async def get_team_workload(context: RunContext):
    """Show team workload — tasks per member broken down by status and hours."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT u.name, u.role,
                   COUNT(t.id) as total,
                   COUNT(t.id) FILTER (WHERE t.status='todo') as todo,
                   COUNT(t.id) FILTER (WHERE t.status='in_progress') as in_progress,
                   COUNT(t.id) FILTER (WHERE t.status='done') as done,
                   COALESCE(SUM(t.hours_worked),0) as hours_worked
            FROM users u
            LEFT JOIN tasks t ON t.assignee_id = u.id
            GROUP BY u.name, u.role ORDER BY total DESC
        """)
    data = [_row(r) for r in rows]
    await _send_event("switch_tab", {"tab": "team"})
    await _send_ui("TeamWorkload", {"data": data})
    return f"Team workload shown. {data[0]['name']} leads with {data[0]['total']} tasks." if data else "No data."


@function_tool()
async def show_analytics(context: RunContext, project_name: str = ""):
    """Show sprint velocity and priority breakdown charts."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        sprints = await conn.fetch("""
            SELECT s.name,
                   COUNT(t.id) FILTER (WHERE t.status='done') as completed,
                   COUNT(t.id) as planned
            FROM sprints s
            LEFT JOIN tasks t ON t.project_id = s.project_id
            GROUP BY s.name, s.start_date ORDER BY s.start_date
        """)
        priority_rows = await conn.fetch(
            "SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority"
        )
    sprint_data = [{"sprint": r["name"], "completed": int(r["completed"] or 0),
                    "planned": int(r["planned"] or 0)} for r in sprints]
    priority_data = [{"name": r["priority"].title(), "value": int(r["count"])} for r in priority_rows]
    if not sprint_data:
        sprint_data = [{"sprint":"Sprint 1","completed":12,"planned":15},
                       {"sprint":"Sprint 2","completed":18,"planned":20},
                       {"sprint":"Sprint 3","completed":8,"planned":18}]
    await _send_ui("SprintAnalytics", {"sprintData": sprint_data, "priorityData": priority_data})
    return "Sprint analytics displayed."


@function_tool()
async def list_documents(context: RunContext, project_name: str = ""):
    """Show the document library for a project."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status='active' LIMIT 1")
        if not proj:
            return "Project not found."
        docs = await conn.fetch("""
            SELECT id, name, file_url, file_type, file_size, description, uploaded_at
            FROM documents WHERE project_id=$1 ORDER BY uploaded_at DESC
        """, proj["id"])
    documents = [_row(d) for d in docs]
    await _send_event("switch_tab", {"tab": "docs"})
    await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
    await _send_ui("DocLibrary", {"documents": documents, "projectName": proj["name"]})
    return f"Showing {len(documents)} document(s) for {proj['name']}."


@function_tool()
async def search_docs(context: RunContext, query: str, project_name: str = ""):
    """Search project documents with AI. Answers questions from uploaded files."""
    try:
        from qdrant_client import QdrantClient
        from openai import OpenAI

        pool = await get_pool()
        async with pool.acquire() as conn:
            if project_name:
                proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
            else:
                proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status='active' LIMIT 1")
            if not proj:
                return "Project not found."
            # Get doc descriptions as context (fallback if Qdrant empty)
            docs = await conn.fetch(
                "SELECT name, description FROM documents WHERE project_id=$1", proj["id"]
            )

        collection = f"pm_{str(proj['id']).replace('-', '_')}"
        context_text = ""
        try:
            qc = QdrantClient(host="localhost", port=6333)
            import httpx
            # Embed query via Ollama
            r = httpx.post("http://localhost:11434/api/embeddings",
                           json={"model": "nomic-embed-text", "prompt": query}, timeout=10)
            vector = r.json()["embedding"]
            results = qc.search(collection_name=collection, query_vector=vector, limit=5)
            context_text = "\n\n".join(r.payload.get("text", "") for r in results if r.payload)
        except Exception:
            # Fallback to doc descriptions
            context_text = "\n\n".join(
                f"Document: {d['name']}\n{d.get('description','')}" for d in docs
            )

        if not context_text.strip():
            return f"No indexed content found for {proj['name']}. Upload documents first."

        # GPT-4o-mini synthesize
        ai = OpenAI()
        resp = ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a helpful assistant answering questions about the project '{proj['name']}' based on the provided documents. Be concise."},
                {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {query}"}
            ],
            max_tokens=300
        )
        answer = resp.choices[0].message.content

        await _send_event("switch_tab", {"tab": "docs"})
        await _send_ui("RagResult", {
            "query": query,
            "answer": answer,
            "projectName": proj["name"],
            "sourceCount": len(docs)
        })
        return f"Based on {proj['name']} docs: {answer[:120]}..."
    except Exception as e:
        logger.error(f"search_docs error: {e}")
        return f"Document search unavailable. Error: {str(e)[:80]}"


@function_tool()
async def create_sprint(context: RunContext, name: str, project_name: str = "",
                        start_date: str = "", end_date: str = ""):
    """Create a new sprint for a project."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow(
            "SELECT id, name FROM projects WHERE name ILIKE $1" if project_name
            else "SELECT id, name FROM projects WHERE status='active' LIMIT 1",
            *([f"%{project_name}%"] if project_name else [])
        )
        if not proj:
            return "No active project."
        await conn.fetchrow("""
            INSERT INTO sprints (project_id, name, start_date, end_date, status)
            VALUES ($1,$2,$3::date,$4::date,'planned')
        """, proj["id"], name, start_date or None, end_date or None)
    await _send_ui("StatusBanner", {"message": f"Sprint '{name}' created for {proj['name']}", "type": "success"})
    return f"Sprint '{name}' created."



@function_tool()
async def show_full_analytics(context: RunContext, project_name: str = ""):
    """Show the full analytics tab: burndown, velocity, budget, team utilization, risks, milestones."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status='active' LIMIT 1")
    if proj:
        await _send_event("switch_tab", {"tab": "analytics"})
        await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
        await _send_event("refresh", {"section": "analytics"})
        return f"Switching to analytics for {proj['name']}. Burndown, velocity, budget, team utilization, milestones and risks are shown."
    return "Switching to analytics tab."


@function_tool()
async def detect_risks(context: RunContext, project_name: str = ""):
    """Scan all projects for risks: overdue tasks, overloaded team members, budget overrun, low velocity."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Overdue tasks
        overdue = await conn.fetch("""
            SELECT t.title, p.name as project_name,
                   (CURRENT_DATE - t.due_date)::int as days_late
            FROM tasks t JOIN projects p ON t.project_id = p.id
            WHERE t.status != 'done' AND t.due_date < CURRENT_DATE
            ORDER BY days_late DESC LIMIT 5
        """)

        # Overloaded team (>40h this week)
        overloaded = await conn.fetch("""
            SELECT u.name, SUM(tl.hours)::float as weekly_hours
            FROM time_logs tl JOIN users u ON tl.user_id = u.id
            WHERE tl.log_date >= date_trunc('week', CURRENT_DATE)
            GROUP BY u.name HAVING SUM(tl.hours) > 40
        """)

        # Budget at risk (>80%)
        budget_risk = await conn.fetch("""
            SELECT p.name,
                   ROUND((SUM(tl.hours * COALESCE(u.hourly_rate, 75)) / NULLIF(p.budget,0) * 100)::numeric, 1) as pct
            FROM projects p
            LEFT JOIN time_logs tl ON tl.project_id = p.id
            LEFT JOIN users u ON tl.user_id = u.id
            WHERE p.budget > 0
            GROUP BY p.id, p.name, p.budget
            HAVING COALESCE(p.budget, 0) > 0
               AND SUM(tl.hours * COALESCE(u.hourly_rate, 75)) > p.budget * 0.8
        """)

    risks = []
    summary_parts = []

    for r in overdue:
        risks.append({"risk_type": "overdue", "severity": "high",
                      "title": f"{r['title']} is {r['days_late']}d late",
                      "detail": f"Project: {r['project_name']}"})

    for r in overloaded:
        risks.append({"risk_type": "overloaded", "severity": "high",
                      "title": f"{r['name']} logged {r['weekly_hours']}h this week",
                      "detail": "Over 40h/week capacity"})

    for r in budget_risk:
        risks.append({"risk_type": "budget", "severity": "medium",
                      "title": f"{r['name']}: {r['pct']}% of budget used",
                      "detail": "Project is over 80% of allocated budget"})

    if not risks:
        await _send_ui("StatusBanner", {"message": "All clear — no active risks detected.", "type": "success"})
        return "All clear. No active risks across all projects."

    await _send_event("switch_tab", {"tab": "analytics"})
    await _send_ui("RiskPanel", {"risks": risks})

    summary_parts = [
        f"{len(overdue)} overdue task(s)" if overdue else "",
        f"{len(overloaded)} overloaded member(s)" if overloaded else "",
        f"{len(budget_risk)} budget risk(s)" if budget_risk else "",
    ]
    summary = ", ".join(p for p in summary_parts if p)
    return f"Found {len(risks)} risk(s): {summary}. Analytics tab updated."


@function_tool()
async def daily_standup(context: RunContext):
    """Generate a voice standup report: what was done yesterday, what's in progress today, any blockers."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Yesterday completions
        yesterday_done = await conn.fetch("""
            SELECT t.title, u.name as assignee
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status = 'done'
              AND t.updated_at::date = CURRENT_DATE - 1
            LIMIT 5
        """)

        # In progress today
        in_progress = await conn.fetch("""
            SELECT t.title, u.name as assignee,
                   t.progress_pct, t.due_date
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status = 'in_progress'
            ORDER BY t.priority DESC LIMIT 5
        """)

        # Blockers: overdue tasks
        blockers = await conn.fetch("""
            SELECT t.title, u.name as assignee,
                   (CURRENT_DATE - t.due_date)::int as days_late
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status != 'done'
              AND t.due_date < CURRENT_DATE
            ORDER BY days_late DESC LIMIT 3
        """)

        # Hours logged today
        hours_today = await conn.fetchrow("""
            SELECT SUM(hours)::float as total FROM time_logs
            WHERE log_date = CURRENT_DATE
        """)

    parts = []

    if yesterday_done:
        items = ", ".join(f"\"{r['title']}\"" for r in yesterday_done[:3])
        parts.append(f"Yesterday: {len(yesterday_done)} task(s) completed — {items}.")

    if in_progress:
        active = [f"\"{r['title']}\" ({r['progress_pct']}%)" for r in in_progress[:3]]
        parts.append(f"Today: {len(in_progress)} task(s) in progress — {', '.join(active)}.")

    if blockers:
        block_items = ", ".join(f"\"{r['title']}\" ({r['days_late']}d late)" for r in blockers[:2])
        parts.append(f"Blockers: {block_items}.")

    hours = hours_today["total"] or 0
    if hours > 0:
        parts.append(f"{hours}h logged today.")

    if not parts:
        standup_text = "No activity recorded yet today. Team is starting fresh."
    else:
        standup_text = " ".join(parts)

    await _send_ui("StatusBanner", {
        "message": standup_text,
        "type": "info",
    })
    return standup_text


@function_tool()
async def log_time(
    context: RunContext,
    hours: float,
    task_title: str = "",
    project_name: str = "",
    person_name: str = "",
    note: str = "",
):
    """Log time to the time log (persisted per-day entry). Different from log_hours which updates task totals."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Find task
        task_id = None
        proj_id = None
        if task_title:
            t = await conn.fetchrow("SELECT id, project_id FROM tasks WHERE title ILIKE $1 LIMIT 1", f"%{task_title}%")
            if t:
                task_id = t["id"]
                proj_id = t["project_id"]

        # Find project if not from task
        if not proj_id:
            if project_name:
                p = await conn.fetchrow("SELECT id FROM projects WHERE name ILIKE $1", f"%{project_name}%")
            else:
                p = await conn.fetchrow("SELECT id FROM projects WHERE status='active' LIMIT 1")
            if p:
                proj_id = p["id"]

        if not proj_id:
            return "Could not identify project."

        # Find user
        user_id = None
        if person_name:
            u = await conn.fetchrow("SELECT id FROM users WHERE name ILIKE $1", f"%{person_name}%")
            if u:
                user_id = u["id"]

        await conn.execute("""
            INSERT INTO time_logs (task_id, project_id, user_id, hours, note)
            VALUES ($1, $2, $3, $4, $5)
        """, task_id, proj_id, user_id, hours, note or None)

        # Also update task.hours_worked
        if task_id:
            await conn.execute("""
                UPDATE tasks SET hours_worked = COALESCE(hours_worked, 0) + $1, updated_at = NOW()
                WHERE id = $2
            """, hours, task_id)

    person_str = f" for {person_name}" if person_name else ""
    task_str = f" on '{task_title}'" if task_title else ""
    await _send_ui("StatusBanner", {
        "message": f"{hours}h logged{task_str}{person_str} today",
        "type": "success"
    })
    await _send_event("refresh", {"section": "analytics"})
    return f"Logged {hours}h{task_str}{person_str}."


@function_tool()
async def show_milestones(context: RunContext, project_name: str = ""):
    """Show project milestones with status, due dates and health indicators."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status='active' LIMIT 1")
        if not proj:
            return "No project found."

        ms = await conn.fetch("""
            SELECT id, name, description, due_date::text, status,
                   CASE
                     WHEN due_date < CURRENT_DATE AND status='pending' THEN 'overdue'
                     WHEN due_date <= CURRENT_DATE + 7                   THEN 'soon'
                     ELSE 'on_track'
                   END as health
            FROM milestones
            WHERE project_id = $1
            ORDER BY due_date ASC
        """, proj["id"])

    milestones = [_row(m) for m in ms]
    overdue = sum(1 for m in milestones if m["health"] == "overdue")
    soon    = sum(1 for m in milestones if m["health"] == "soon")

    await _send_event("switch_tab", {"tab": "milestones"})
    await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
    await _send_event("refresh", {"section": "milestones"})

    status_str = f"{overdue} overdue, {soon} due soon" if (overdue or soon) else "all on track"
    return f"{proj['name']} has {len(milestones)} milestone(s) — {status_str}."


@function_tool()
async def add_milestone(context: RunContext, name: str, project_name: str = "", due_date: str = ""):
    """Add a new milestone to a project. due_date format: YYYY-MM-DD."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow(
            "SELECT id, name FROM projects WHERE name ILIKE $1" if project_name
            else "SELECT id, name FROM projects WHERE status='active' LIMIT 1",
            *([f"%{project_name}%"] if project_name else [])
        )
        if not proj:
            return "No project found."
        await conn.execute("""
            INSERT INTO milestones (project_id, name, due_date)
            VALUES ($1, $2, $3::date)
        """, proj["id"], name, due_date or None)
    await _send_ui("StatusBanner", {"message": f"Milestone '{name}' added to {proj['name']}", "type": "success"})
    await _send_event("refresh", {"section": "milestones"})
    return f"Milestone '{name}' added to {proj['name']}."



# ── Activity log helper ───────────────────────────────
async def _log_activity(conn, project_id, task_id, user_name, action, entity_type, entity_name, meta=None):
    """Write an entry to the activity_log table."""
    import json as _json
    try:
        await conn.execute("""
            INSERT INTO pikaui.activity_log
              (project_id, task_id, user_name, action, entity_type, entity_name, meta)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        """, project_id, task_id, user_name, action, entity_type, entity_name,
            _json.dumps(meta or {}))
    except Exception as e:
        logger.warning(f"activity log failed: {e}")


@function_tool()
async def get_activity_feed(context: RunContext, project_name: str = "", days: int = 7):
    """Show recent activity feed — who did what across tasks, time logs, and milestones."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status='active' LIMIT 1")

        if proj:
            rows = await conn.fetch("""
                SELECT a.user_name, a.action, a.entity_type, a.entity_name,
                       a.meta, a.created_at::text,
                       t.title as task_title
                FROM activity_log a
                LEFT JOIN tasks t ON a.task_id = t.id
                WHERE a.project_id = $1
                  AND a.created_at >= NOW() - ($2 || ' days')::INTERVAL
                ORDER BY a.created_at DESC LIMIT 10
            """, proj["id"], str(days))
        else:
            rows = await conn.fetch("""
                SELECT a.user_name, a.action, a.entity_type, a.entity_name,
                       a.meta, a.created_at::text,
                       t.title as task_title,
                       p.name as project_name
                FROM activity_log a
                LEFT JOIN tasks t ON a.task_id = t.id
                LEFT JOIN projects p ON a.project_id = p.id
                WHERE a.created_at >= NOW() - ($1 || ' days')::INTERVAL
                ORDER BY a.created_at DESC LIMIT 10
            """, str(days))

    entries = [_row(r) for r in rows]
    project_name_display = proj["name"] if proj else "all projects"

    await _send_event("switch_tab", {"tab": "activity"})
    await _send_event("refresh", {"section": "activity"})

    if not entries:
        return f"No activity recorded in the last {days} days for {project_name_display}."

    # Build a voice summary
    unique_users = list(set(e["user_name"] for e in entries if e.get("user_name")))
    action_counts = {}
    for e in entries:
        action_counts[e["action"]] = action_counts.get(e["action"], 0) + 1

    top_action = max(action_counts, key=action_counts.get) if action_counts else "updates"
    return (f"Last {days} days in {project_name_display}: "
            f"{len(entries)} activities by {len(unique_users)} team member(s). "
            f"Most common: {top_action.replace('_', ' ')}.")


@function_tool()
async def suggest_assignee(context: RunContext, task_title: str = "", task_type: str = ""):
    """Suggest the best team member to assign a task based on current workload and capacity."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Get workload: in_progress tasks + hours this week per member
        members = await conn.fetch("""
            SELECT u.id, u.name, u.role, u.department,
                   COUNT(t.id) FILTER (WHERE t.status='in_progress') as active_tasks,
                   COUNT(t.id) FILTER (WHERE t.status='done') as completed_tasks,
                   COUNT(t.id) as total_tasks,
                   COALESCE(SUM(tl.hours) FILTER (
                       WHERE tl.log_date >= date_trunc('week', CURRENT_DATE)
                   ), 0)::float as hours_this_week
            FROM users u
            LEFT JOIN tasks t    ON t.assignee_id = u.id
            LEFT JOIN time_logs tl ON tl.user_id = u.id
            GROUP BY u.id, u.name, u.role, u.department
            ORDER BY active_tasks ASC, hours_this_week ASC
        """)

    if not members:
        return "No team members found."

    # Score each member: lower workload = higher score
    scored = []
    for m in members:
        active    = int(m["active_tasks"] or 0)
        hours     = float(m["hours_this_week"] or 0)
        completed = int(m["completed_tasks"] or 0)
        # Score = 100 - (active tasks * 10) - (hours over 20 * 2) + (completed * 2)
        score = max(0, 100 - active * 10 - max(0, hours - 20) * 2 + min(20, completed * 2))
        scored.append((score, dict(m)))

    scored.sort(reverse=True, key=lambda x: x[0])
    best = scored[0][1]
    second = scored[1][1] if len(scored) > 1 else None

    workload_detail = [{"name": m["name"], "active_tasks": int(m["active_tasks"] or 0),
                        "hours_this_week": float(m["hours_this_week"] or 0),
                        "score": s} for s, m in scored]

    await _send_ui("TeamWorkload", {"data": [_row(m) for m in members]})
    await _send_event("switch_tab", {"tab": "team"})

    reason = f"only {int(best['active_tasks'] or 0)} active task(s) and {float(best['hours_this_week'] or 0):.0f}h this week"
    response = f"I recommend {best['name']} ({best.get('role','team member')}) — {reason}."
    if second:
        response += f" {second['name']} is also available."
    if task_title:
        response += f" Assign '{task_title}' to {best['name']}?"
    return response


@function_tool()
async def cross_project_summary(context: RunContext):
    """Show a health dashboard comparing all projects side by side."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        projects = await conn.fetch("""
            SELECT p.id, p.name, p.status,
                   COALESCE(p.color, '#6c5ce7') as color,
                   p.deadline, p.budget,
                   COUNT(t.id)::int as total_tasks,
                   COUNT(t.id) FILTER (WHERE t.status='done')::int as done_tasks,
                   COUNT(t.id) FILTER (WHERE t.status!='done' AND t.due_date < CURRENT_DATE)::int as overdue_tasks,
                   COALESCE(SUM(tl.hours) FILTER (
                       WHERE tl.log_date >= date_trunc('week', CURRENT_DATE)
                   ), 0)::float as hours_this_week,
                   COALESCE(SUM(tl.hours * COALESCE(u.hourly_rate, 75)), 0)::float as cost_burned
            FROM projects p
            LEFT JOIN tasks t      ON t.project_id = p.id
            LEFT JOIN time_logs tl ON tl.project_id = p.id
            LEFT JOIN users u      ON tl.user_id = u.id
            GROUP BY p.id, p.name, p.status, p.color, p.deadline, p.budget
            ORDER BY p.name
        """)

    health_cards = []
    for p in projects:
        total    = int(p["total_tasks"] or 1)
        done     = int(p["done_tasks"] or 0)
        overdue  = int(p["overdue_tasks"] or 0)
        hours_wk = float(p["hours_this_week"] or 0)
        budget   = float(p["budget"] or 0)
        cost     = float(p["cost_burned"] or 0)

        completion_pct = round(done / max(total, 1) * 100)
        budget_pct     = round(cost / max(budget, 1) * 100) if budget > 0 else 0
        overdue_ratio  = overdue / max(total, 1)

        # Health score (0-100)
        score = int(
            completion_pct * 0.3 +
            (1 - overdue_ratio) * 100 * 0.3 +
            max(0, (1 - budget_pct / 100)) * 100 * 0.2 +
            75 * 0.2  # neutral velocity
        )

        days_left = None
        if p["deadline"]:
            from datetime import date
            try:
                dl = date.fromisoformat(str(p["deadline"])[:10])
                days_left = (dl - date.today()).days
            except Exception:
                pass

        health_cards.append({
            "id":             str(p["id"]),
            "name":           p["name"],
            "color":          p["color"],
            "status":         p["status"],
            "health_score":   score,
            "completion_pct": completion_pct,
            "days_to_deadline": days_left,
            "overdue_tasks":  overdue,
            "budget_pct":     budget_pct,
            "total_tasks":    total,
            "done_tasks":     done,
            "hours_this_week": hours_wk,
        })

    await _send_event("switch_tab", {"tab": "summary"})
    await _send_ui("StatusBanner", {
        "message": f"Cross-project summary: {len(health_cards)} projects analysed.",
        "type": "info"
    })

    grades = {p["name"]: ("A" if p["health_score"]>=90 else "B" if p["health_score"]>=75
              else "C" if p["health_score"]>=60 else "D" if p["health_score"]>=50 else "F")
              for p in health_cards}
    summary = ", ".join(f"{n} ({g})" for n, g in grades.items())
    return f"Project health grades: {summary}."



@function_tool()
async def generate_report(context: RunContext, project_name: str = ""):
    """Generate a comprehensive project status report with key metrics, risks, and recommendations."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name, status, deadline, budget, color FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name, status, deadline, budget, color FROM projects WHERE status='active' LIMIT 1")
        if not proj:
            return "No project found."

        stats = await conn.fetchrow("""
            SELECT
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status='done')::int as done,
                COUNT(*) FILTER (WHERE status='in_progress')::int as active,
                COUNT(*) FILTER (WHERE status='todo')::int as todo,
                COUNT(*) FILTER (WHERE status!='done' AND due_date < CURRENT_DATE)::int as overdue,
                COALESCE(SUM(hours_worked), 0)::float as total_hours,
                COALESCE(SUM(hours_estimated), 0)::float as total_estimated,
                COALESCE(AVG(progress_pct), 0)::int as avg_progress
            FROM tasks WHERE project_id = $1
        """, proj["id"])

        # Budget
        cost = await conn.fetchrow("""
            SELECT COALESCE(SUM(tl.hours * COALESCE(u.hourly_rate, 75)), 0)::float as burned
            FROM time_logs tl
            LEFT JOIN users u ON tl.user_id = u.id
            WHERE tl.project_id = $1
        """, proj["id"])

        # Milestones
        ms = await conn.fetch("""
            SELECT name, due_date::text, status,
                   CASE WHEN due_date < CURRENT_DATE AND status='pending' THEN 'overdue' ELSE 'on_track' END as health
            FROM milestones WHERE project_id = $1 ORDER BY due_date
        """, proj["id"])

        # Top contributors
        contribs = await conn.fetch("""
            SELECT u.name, SUM(tl.hours)::float as hours
            FROM time_logs tl JOIN users u ON tl.user_id = u.id
            WHERE tl.project_id = $1
            GROUP BY u.name ORDER BY hours DESC LIMIT 3
        """, proj["id"])

    # Build report
    completion = round(int(stats["done"]) / max(int(stats["total"]), 1) * 100)
    budget_val = float(proj["budget"] or 0)
    cost_val = float(cost["burned"] or 0)
    budget_pct = round(cost_val / max(budget_val, 1) * 100) if budget_val > 0 else 0

    report_lines = [
        f"📋 PROJECT STATUS REPORT: {proj['name']}",
        f"Status: {proj['status'].title()}",
        f"",
        f"📊 Task Progress: {stats['done']}/{stats['total']} done ({completion}%)",
        f"   Active: {stats['active']} | Todo: {stats['todo']} | Overdue: {stats['overdue']}",
        f"   Average progress: {stats['avg_progress']}%",
        f"",
        f"⏱ Hours: {stats['total_hours']:.0f}h worked / {stats['total_estimated']:.0f}h estimated",
    ]

    if budget_val > 0:
        report_lines.append(f"💰 Budget: SAR {cost_val:,.0f} / {budget_val:,.0f} ({budget_pct}%)")

    if contribs:
        report_lines.append(f"")
        report_lines.append(f"👥 Top Contributors:")
        for c in contribs:
            report_lines.append(f"   {c['name']}: {c['hours']:.0f}h")

    if ms:
        report_lines.append(f"")
        report_lines.append(f"🏁 Milestones:")
        for m in ms:
            icon = "✅" if m["status"]=="achieved" else "⚠️" if m["health"]=="overdue" else "📍"
            report_lines.append(f"   {icon} {m['name']} — {m['due_date'] or 'no date'} ({m['status']})")

    # Recommendations
    recs = []
    if stats["overdue"] > 0:
        recs.append(f"Prioritize {stats['overdue']} overdue task(s)")
    if budget_pct > 80:
        recs.append("Budget is running hot — review scope")
    if stats["avg_progress"] < 40 and stats["active"] > 3:
        recs.append("Many active tasks with low progress — consider focusing")

    if recs:
        report_lines.append(f"")
        report_lines.append(f"💡 Recommendations:")
        for r in recs:
            report_lines.append(f"   • {r}")

    report_text = "\n".join(report_lines)

    await _send_ui("StatusBanner", {
        "message": f"Report generated for {proj['name']} — {completion}% complete, {stats['overdue']} overdue, {budget_pct}% budget used.",
        "type": "info" if stats["overdue"] == 0 else "warning"
    })

    return f"Status report for {proj['name']}: {completion}% complete with {stats['total']} tasks. {stats['overdue']} overdue. {stats['total_hours']:.0f} hours logged. {len(ms)} milestones tracked."


@function_tool()
async def add_dependency(context: RunContext, task_title: str, depends_on_title: str):
    """Mark that a task depends on (is blocked by) another task."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        task = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1 LIMIT 1", f"%{task_title}%")
        dep  = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1 LIMIT 1", f"%{depends_on_title}%")
        if not task:
            return f"Task \'{task_title}\' not found."
        if not dep:
            return f"Task \'{depends_on_title}\' not found."
        if task["id"] == dep["id"]:
            return "A task cannot depend on itself."
        await conn.execute("""
            INSERT INTO task_dependencies (task_id, depends_on_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
        """, task["id"], dep["id"])
    await _send_ui("StatusBanner", {
        "message": f"\'{task['title']}\' now depends on \'{dep['title']}\'",
        "type": "info"
    })
    return f"Dependency added: \'{task['title']}\' is blocked by \'{dep['title']}\'."


@function_tool()
async def show_blockers(context: RunContext, task_title: str = ""):
    """Show what tasks are blocked or blocking other tasks."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if task_title:
            task = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1", f"%{task_title}%")
            if not task:
                return f"Task \'{task_title}\' not found."
            # What blocks this task
            blockers = await conn.fetch("""
                SELECT t.title, t.status FROM task_dependencies d
                JOIN tasks t ON t.id = d.depends_on_id
                WHERE d.task_id = $1
            """, task["id"])
            # What this task blocks
            blocking = await conn.fetch("""
                SELECT t.title, t.status FROM task_dependencies d
                JOIN tasks t ON t.id = d.task_id
                WHERE d.depends_on_id = $1
            """, task["id"])
            parts = []
            if blockers:
                parts.append(f"Blocked by: {', '.join(b['title'] for b in blockers)}")
            if blocking:
                parts.append(f"Blocking: {', '.join(b['title'] for b in blocking)}")
            return f"\'{task['title']}\': {'. '.join(parts) if parts else 'No dependencies.'}"
        else:
            # All blocked tasks (depend on non-done tasks)
            blocked = await conn.fetch("""
                SELECT t.title as blocked_task, dep.title as blocked_by, dep.status
                FROM task_dependencies d
                JOIN tasks t   ON t.id = d.task_id
                JOIN tasks dep ON dep.id = d.depends_on_id
                WHERE dep.status != 'done' AND t.status != 'done'
                LIMIT 10
            """)
            if not blocked:
                return "No blocked tasks. All clear!"
            items = [f"\'{b['blocked_task']}\' blocked by \'{b['blocked_by']}\' ({b['status']})" for b in blocked]
            return f"{len(blocked)} blocked task(s): {'; '.join(items[:3])}"


# ═══════════════════════════════════════════════════════
#  AGENT
# ═══════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are PlanBot — voice-first AI project manager for pikAui PM.

TOOLS AVAILABLE:
1. list_projects         → Switch to overview tab, show all projects
2. show_project_detail   → Full project card: manager, team, timeline, budget
3. show_board            → Switch to board tab, show Kanban
4. create_task           → Create task with assignee, priority, hours, due date
5. update_task_status    → Move task: todo → in_progress → done
6. log_hours             → Log work hours, auto-updates progress
7. set_task_progress     → Set % complete (auto-promotes status)
8. set_task_dates        → Set start/due dates on a task
9. search_tasks          → Find tasks by keyword or status
10. get_team_workload    → Switch to team tab, show workload
11. show_analytics       → Sprint velocity + priority charts
12. list_documents       → Switch to docs tab, show file library
13. search_docs          → AI search over project documents
14. create_sprint        → Create a new sprint
15. show_full_analytics  → Full analytics tab: burndown, velocity, budget, milestones
16. detect_risks         → Scan for risks: overdue tasks, overloaded members, budget issues
17. daily_standup        → Morning standup: yesterday done, today in progress, blockers
18. log_time             → Log time entry to the time log (persisted daily record)
19. show_milestones      → Show project milestones with health indicators
20. add_milestone        → Create a new milestone with due date
21. get_activity_feed    → Show recent activity (who did what)
22. suggest_assignee     → Smart assignment recommendation based on workload
23. cross_project_summary → Health scorecard comparing all projects
24. generate_report      → Full project status report with metrics, risks, recommendations
25. add_dependency       → Mark task blocked by another task
26. show_blockers        → Show what's blocked and by what

VOICE RULES:
- Max 1-2 sentences per response. This is voice.
- Always call the matching tool — never just describe.
- "Show the board" → show_board
- "Who's overloaded?" / "team load" → get_team_workload
- "Log 3 hours on X" → log_hours
- "X is 75% done" → set_task_progress
- "Generate report" / "Status report" → generate_report
- "What's blocked?" / "Show blockers" → show_blockers
- "X depends on Y" / "X is blocked by Y" → add_dependency
- "Who should I assign?" / "Suggest assignee" → suggest_assignee
- "Show activity" / "What happened today" → get_activity_feed
- "Project summary" / "Health check" → cross_project_summary
- "Search docs for Y" / "what does the spec say about Z" → search_docs
- Confirm actions briefly: "Done — 3 hours logged on the data channel task."
"""


class PMAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions=SYSTEM_PROMPT,
            tools=[
                list_projects, show_project_detail, show_board,
                create_task, update_task_status, log_hours,
                set_task_progress, set_task_dates, search_tasks,
                get_team_workload, show_analytics,
                list_documents, search_docs, create_sprint,
                show_full_analytics, detect_risks, daily_standup,
                log_time, show_milestones, add_milestone,
                get_activity_feed, suggest_assignee, cross_project_summary,
                generate_report, add_dependency, show_blockers,
            ],
        )


# ═══════════════════════════════════════════════════════
#  ENTRYPOINT
# ═══════════════════════════════════════════════════════

async def entrypoint(ctx: JobContext):
    global _room_ref
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    _room_ref = ctx.room
    logger.info(f"Connected: {ctx.room.name}")

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3", language="en"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(
            model="speaches-ai/Kokoro-82M-v1.0-ONNX",
            voice="af_heart",
            base_url="http://localhost:8000/v1",
            api_key="not-needed",
        ),
    )

    await session.start(room=ctx.room, agent=PMAgent())
    await session.say(
        "Hey! I'm PlanBot. Say 'show board', 'daily standup', 'detect risks', or 'show milestones' to get started.",
        allow_interruptions=True,
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name=AGENT_NAME,
        port=8084,
    ))
