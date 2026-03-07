"""Patch agent.py — insert 6 new voice tools before the SYSTEM_PROMPT block."""
import re

path = "agent.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

MARKER = "\n# ═══════════════════════════════════════════════════════\n#  AGENT\n# ═══════════════════════════════════════════════════════"

NEW_TOOLS = '''

@function_tool()
async def show_full_analytics(context: RunContext, project_name: str = ""):
    """Show the full analytics tab: burndown, velocity, budget, team utilization, risks, milestones."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status=\'active\' LIMIT 1")
    if proj:
        await _send_event("switch_tab", {"tab": "analytics"})
        await _send_event("switch_project", {"projectId": str(proj["id"]), "projectName": proj["name"]})
        await _send_event("refresh", {"section": "analytics"})
        return f"Switching to analytics for {proj[\'name\']}. Burndown, velocity, budget, team utilization, milestones and risks are shown."
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
            WHERE t.status != \'done\' AND t.due_date < CURRENT_DATE
            ORDER BY days_late DESC LIMIT 5
        """)

        # Overloaded team (>40h this week)
        overloaded = await conn.fetch("""
            SELECT u.name, SUM(tl.hours)::float as weekly_hours
            FROM time_logs tl JOIN users u ON tl.user_id = u.id
            WHERE tl.log_date >= date_trunc(\'week\', CURRENT_DATE)
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
                      "title": f"{r[\'title\']} is {r[\'days_late\']}d late",
                      "detail": f"Project: {r[\'project_name\']}"})

    for r in overloaded:
        risks.append({"risk_type": "overloaded", "severity": "high",
                      "title": f"{r[\'name\']} logged {r[\'weekly_hours\']}h this week",
                      "detail": "Over 40h/week capacity"})

    for r in budget_risk:
        risks.append({"risk_type": "budget", "severity": "medium",
                      "title": f"{r[\'name\']}: {r[\'pct\']}% of budget used",
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
    """Generate a voice standup report: what was done yesterday, what\'s in progress today, any blockers."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Yesterday completions
        yesterday_done = await conn.fetch("""
            SELECT t.title, u.name as assignee
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status = \'done\'
              AND t.updated_at::date = CURRENT_DATE - 1
            LIMIT 5
        """)

        # In progress today
        in_progress = await conn.fetch("""
            SELECT t.title, u.name as assignee,
                   t.progress_pct, t.due_date
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status = \'in_progress\'
            ORDER BY t.priority DESC LIMIT 5
        """)

        # Blockers: overdue tasks
        blockers = await conn.fetch("""
            SELECT t.title, u.name as assignee,
                   (CURRENT_DATE - t.due_date)::int as days_late
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE t.status != \'done\'
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
        items = ", ".join(f"\\"{r[\'title\']}\\"" for r in yesterday_done[:3])
        parts.append(f"Yesterday: {len(yesterday_done)} task(s) completed — {items}.")

    if in_progress:
        active = [f"\\"{r[\'title\']}\\" ({r[\'progress_pct\']}%)" for r in in_progress[:3]]
        parts.append(f"Today: {len(in_progress)} task(s) in progress — {', '.join(active)}.")

    if blockers:
        block_items = ", ".join(f"\\"{r[\'title\']}\\" ({r[\'days_late\']}d late)" for r in blockers[:2])
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
                p = await conn.fetchrow("SELECT id FROM projects WHERE status=\'active\' LIMIT 1")
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
    task_str = f" on \'{task_title}\'" if task_title else ""
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
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status=\'active\' LIMIT 1")
        if not proj:
            return "No project found."

        ms = await conn.fetch("""
            SELECT id, name, description, due_date::text, status,
                   CASE
                     WHEN due_date < CURRENT_DATE AND status=\'pending\' THEN \'overdue\'
                     WHEN due_date <= CURRENT_DATE + 7                   THEN \'soon\'
                     ELSE \'on_track\'
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
    return f"{proj[\'name\']} has {len(milestones)} milestone(s) — {status_str}."


@function_tool()
async def add_milestone(context: RunContext, name: str, project_name: str = "", due_date: str = ""):
    """Add a new milestone to a project. due_date format: YYYY-MM-DD."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        proj = await conn.fetchrow(
            "SELECT id, name FROM projects WHERE name ILIKE $1" if project_name
            else "SELECT id, name FROM projects WHERE status=\'active\' LIMIT 1",
            *([f"%{project_name}%"] if project_name else [])
        )
        if not proj:
            return "No project found."
        await conn.execute("""
            INSERT INTO milestones (project_id, name, due_date)
            VALUES ($1, $2, $3::date)
        """, proj["id"], name, due_date or None)
    await _send_ui("StatusBanner", {"message": f"Milestone \'{name}\' added to {proj[\'name\']}", "type": "success"})
    await _send_event("refresh", {"section": "milestones"})
    return f"Milestone \'{name}\' added to {proj[\'name\']}."

'''

if MARKER in code:
    code = code.replace(MARKER, NEW_TOOLS + MARKER)
    print("✓ New tools inserted")
else:
    print("✗ MARKER not found — check agent.py")
    import sys; sys.exit(1)

# Also update SYSTEM_PROMPT to mention new tools
OLD_PROMPT_TAIL = """14. create_sprint        → Create a new sprint

VOICE RULES:"""

NEW_PROMPT_TAIL = """14. create_sprint        → Create a new sprint
15. show_full_analytics  → Full analytics tab: burndown, velocity, budget, milestones
16. detect_risks         → Scan for risks: overdue tasks, overloaded members, budget issues
17. daily_standup        → Morning standup: yesterday done, today in progress, blockers
18. log_time             → Log time entry to the time log (persisted daily record)
19. show_milestones      → Show project milestones with health indicators
20. add_milestone        → Create a new milestone with due date

VOICE RULES:"""

code = code.replace(OLD_PROMPT_TAIL, NEW_PROMPT_TAIL)

# Update tools list in PMAgent
OLD_TOOLS_LIST = """                list_projects, show_project_detail, show_board,
                create_task, update_task_status, log_hours,
                set_task_progress, set_task_dates, search_tasks,
                get_team_workload, show_analytics,
                list_documents, search_docs, create_sprint,"""

NEW_TOOLS_LIST = """                list_projects, show_project_detail, show_board,
                create_task, update_task_status, log_hours,
                set_task_progress, set_task_dates, search_tasks,
                get_team_workload, show_analytics,
                list_documents, search_docs, create_sprint,
                show_full_analytics, detect_risks, daily_standup,
                log_time, show_milestones, add_milestone,"""

code = code.replace(OLD_TOOLS_LIST, NEW_TOOLS_LIST)

# Update startup message
OLD_MSG = '        "Hey! I\'m PlanBot. Say \'show board\', \'log hours\', or \'search docs\' — I\'ll handle the rest.",'
NEW_MSG = '        "Hey! I\'m PlanBot. Say \'show board\', \'daily standup\', \'detect risks\', or \'show milestones\' to get started.",'
code = code.replace(OLD_MSG, NEW_MSG)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("✓ agent.py patched with 6 new tools (total: 20 tools)")
