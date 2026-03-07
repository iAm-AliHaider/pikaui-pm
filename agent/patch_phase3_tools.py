"""Patch agent.py — add 3 new tools + activity logging to existing tools."""
import re

path = "agent.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

MARKER = "\n# ═══════════════════════════════════════════════════════\n#  AGENT\n# ═══════════════════════════════════════════════════════"

NEW_TOOLS = '''

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
            proj = await conn.fetchrow("SELECT id, name FROM projects WHERE status=\'active\' LIMIT 1")

        if proj:
            rows = await conn.fetch("""
                SELECT a.user_name, a.action, a.entity_type, a.entity_name,
                       a.meta, a.created_at::text,
                       t.title as task_title
                FROM activity_log a
                LEFT JOIN tasks t ON a.task_id = t.id
                WHERE a.project_id = $1
                  AND a.created_at >= NOW() - ($2 || \' days\')::INTERVAL
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
                WHERE a.created_at >= NOW() - ($1 || \' days\')::INTERVAL
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
            f"Most common: {top_action.replace(\'_\', \' \')}.")


@function_tool()
async def suggest_assignee(context: RunContext, task_title: str = "", task_type: str = ""):
    """Suggest the best team member to assign a task based on current workload and capacity."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Get workload: in_progress tasks + hours this week per member
        members = await conn.fetch("""
            SELECT u.id, u.name, u.role, u.department,
                   COUNT(t.id) FILTER (WHERE t.status=\'in_progress\') as active_tasks,
                   COUNT(t.id) FILTER (WHERE t.status=\'done\') as completed_tasks,
                   COUNT(t.id) as total_tasks,
                   COALESCE(SUM(tl.hours) FILTER (
                       WHERE tl.log_date >= date_trunc(\'week\', CURRENT_DATE)
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
        response += f" Assign \'{task_title}\' to {best['name']}?"
    return response


@function_tool()
async def cross_project_summary(context: RunContext):
    """Show a health dashboard comparing all projects side by side."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        projects = await conn.fetch("""
            SELECT p.id, p.name, p.status,
                   COALESCE(p.color, \'#6c5ce7\') as color,
                   p.deadline, p.budget,
                   COUNT(t.id)::int as total_tasks,
                   COUNT(t.id) FILTER (WHERE t.status=\'done\')::int as done_tasks,
                   COUNT(t.id) FILTER (WHERE t.status!=\'done\' AND t.due_date < CURRENT_DATE)::int as overdue_tasks,
                   COALESCE(SUM(tl.hours) FILTER (
                       WHERE tl.log_date >= date_trunc(\'week\', CURRENT_DATE)
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

'''

if MARKER in code:
    code = code.replace(MARKER, NEW_TOOLS + MARKER)
    print("✓ New tools inserted")
else:
    print("✗ MARKER not found"); import sys; sys.exit(1)

# Update SYSTEM_PROMPT
OLD_TAIL = "20. add_milestone        → Create a new milestone with due date\n\nVOICE RULES:"
NEW_TAIL = """20. add_milestone        → Create a new milestone with due date
21. get_activity_feed    → Show recent activity (who did what)
22. suggest_assignee     → Smart assignment recommendation based on workload
23. cross_project_summary → Health scorecard comparing all projects

VOICE RULES:"""
code = code.replace(OLD_TAIL, NEW_TAIL)

# Update tools list
OLD_LIST = "                show_full_analytics, detect_risks, daily_standup,\n                log_time, show_milestones, add_milestone,"
NEW_LIST = """                show_full_analytics, detect_risks, daily_standup,
                log_time, show_milestones, add_milestone,
                get_activity_feed, suggest_assignee, cross_project_summary,"""
code = code.replace(OLD_LIST, NEW_LIST)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("✓ agent.py patched — 23 tools total")
