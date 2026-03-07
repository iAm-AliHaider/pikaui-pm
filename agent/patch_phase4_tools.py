"""Phase 4: generate_report + whatsapp_digest + add_dependency tools."""
path = "agent.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

MARKER = "\n# ═══════════════════════════════════════════════════════\n#  AGENT\n# ═══════════════════════════════════════════════════════"

NEW_TOOLS = '''

@function_tool()
async def generate_report(context: RunContext, project_name: str = ""):
    """Generate a comprehensive project status report with key metrics, risks, and recommendations."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if project_name:
            proj = await conn.fetchrow("SELECT id, name, status, deadline, budget, color FROM projects WHERE name ILIKE $1", f"%{project_name}%")
        else:
            proj = await conn.fetchrow("SELECT id, name, status, deadline, budget, color FROM projects WHERE status=\'active\' LIMIT 1")
        if not proj:
            return "No project found."

        stats = await conn.fetchrow("""
            SELECT
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE status=\'done\')::int as done,
                COUNT(*) FILTER (WHERE status=\'in_progress\')::int as active,
                COUNT(*) FILTER (WHERE status=\'todo\')::int as todo,
                COUNT(*) FILTER (WHERE status!=\'done\' AND due_date < CURRENT_DATE)::int as overdue,
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
                   CASE WHEN due_date < CURRENT_DATE AND status=\'pending\' THEN \'overdue\' ELSE \'on_track\' END as health
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
        f"📋 PROJECT STATUS REPORT: {proj[\'name\']}",
        f"Status: {proj[\'status\'].title()}",
        f"",
        f"📊 Task Progress: {stats[\'done\']}/{stats[\'total\']} done ({completion}%)",
        f"   Active: {stats[\'active\']} | Todo: {stats[\'todo\']} | Overdue: {stats[\'overdue\']}",
        f"   Average progress: {stats[\'avg_progress\']}%",
        f"",
        f"⏱ Hours: {stats[\'total_hours\']:.0f}h worked / {stats[\'total_estimated\']:.0f}h estimated",
    ]

    if budget_val > 0:
        report_lines.append(f"💰 Budget: SAR {cost_val:,.0f} / {budget_val:,.0f} ({budget_pct}%)")

    if contribs:
        report_lines.append(f"")
        report_lines.append(f"👥 Top Contributors:")
        for c in contribs:
            report_lines.append(f"   {c[\'name\']}: {c[\'hours\']:.0f}h")

    if ms:
        report_lines.append(f"")
        report_lines.append(f"🏁 Milestones:")
        for m in ms:
            icon = "✅" if m["status"]=="achieved" else "⚠️" if m["health"]=="overdue" else "📍"
            report_lines.append(f"   {icon} {m[\'name\']} — {m[\'due_date\'] or \'no date\'} ({m[\'status\']})")

    # Recommendations
    recs = []
    if stats["overdue"] > 0:
        recs.append(f"Prioritize {stats[\'overdue\']} overdue task(s)")
    if budget_pct > 80:
        recs.append("Budget is running hot — review scope")
    if stats["avg_progress"] < 40 and stats["active"] > 3:
        recs.append("Many active tasks with low progress — consider focusing")

    if recs:
        report_lines.append(f"")
        report_lines.append(f"💡 Recommendations:")
        for r in recs:
            report_lines.append(f"   • {r}")

    report_text = "\\n".join(report_lines)

    await _send_ui("StatusBanner", {
        "message": f"Report generated for {proj[\'name\']} — {completion}% complete, {stats[\'overdue\']} overdue, {budget_pct}% budget used.",
        "type": "info" if stats["overdue"] == 0 else "warning"
    })

    return f"Status report for {proj[\'name\']}: {completion}% complete with {stats[\'total\']} tasks. {stats[\'overdue\']} overdue. {stats[\'total_hours\']:.0f} hours logged. {len(ms)} milestones tracked."


@function_tool()
async def add_dependency(context: RunContext, task_title: str, depends_on_title: str):
    """Mark that a task depends on (is blocked by) another task."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        task = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1 LIMIT 1", f"%{task_title}%")
        dep  = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1 LIMIT 1", f"%{depends_on_title}%")
        if not task:
            return f"Task \\'{task_title}\\' not found."
        if not dep:
            return f"Task \\'{depends_on_title}\\' not found."
        if task["id"] == dep["id"]:
            return "A task cannot depend on itself."
        await conn.execute("""
            INSERT INTO task_dependencies (task_id, depends_on_id)
            VALUES ($1, $2) ON CONFLICT DO NOTHING
        """, task["id"], dep["id"])
    await _send_ui("StatusBanner", {
        "message": f"\\'{task[\'title\']}\\' now depends on \\'{dep[\'title\']}\\'",
        "type": "info"
    })
    return f"Dependency added: \\'{task[\'title\']}\\' is blocked by \\'{dep[\'title\']}\\'."


@function_tool()
async def show_blockers(context: RunContext, task_title: str = ""):
    """Show what tasks are blocked or blocking other tasks."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        if task_title:
            task = await conn.fetchrow("SELECT id, title FROM tasks WHERE title ILIKE $1", f"%{task_title}%")
            if not task:
                return f"Task \\'{task_title}\\' not found."
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
                parts.append(f"Blocked by: {', '.join(b[\'title\'] for b in blockers)}")
            if blocking:
                parts.append(f"Blocking: {', '.join(b[\'title\'] for b in blocking)}")
            return f"\\'{task[\'title\']}\\': {'. '.join(parts) if parts else 'No dependencies.'}"
        else:
            # All blocked tasks (depend on non-done tasks)
            blocked = await conn.fetch("""
                SELECT t.title as blocked_task, dep.title as blocked_by, dep.status
                FROM task_dependencies d
                JOIN tasks t   ON t.id = d.task_id
                JOIN tasks dep ON dep.id = d.depends_on_id
                WHERE dep.status != \'done\' AND t.status != \'done\'
                LIMIT 10
            """)
            if not blocked:
                return "No blocked tasks. All clear!"
            items = [f"\\'{b[\'blocked_task\']}\\' blocked by \\'{b[\'blocked_by\']}\\' ({b[\'status\']})" for b in blocked]
            return f"{len(blocked)} blocked task(s): {'; '.join(items[:3])}"

'''

if MARKER in code:
    code = code.replace(MARKER, NEW_TOOLS + MARKER)
    print("✓ 3 new tools inserted")
else:
    print("✗ MARKER not found"); import sys; sys.exit(1)

# Update SYSTEM_PROMPT
OLD_TAIL = "23. cross_project_summary → Health scorecard comparing all projects\n\nVOICE RULES:"
NEW_TAIL = """23. cross_project_summary → Health scorecard comparing all projects
24. generate_report      → Full project status report with metrics, risks, recommendations
25. add_dependency       → Mark task blocked by another task
26. show_blockers        → Show what's blocked and by what

VOICE RULES:"""
code = code.replace(OLD_TAIL, NEW_TAIL)

# Update tools list
OLD_LIST = "                get_activity_feed, suggest_assignee, cross_project_summary,"
NEW_LIST = """                get_activity_feed, suggest_assignee, cross_project_summary,
                generate_report, add_dependency, show_blockers,"""
code = code.replace(OLD_LIST, NEW_LIST)

# Add voice rules
OLD_RULES = '- "X is 75% done" → set_task_progress'
NEW_RULES = '''- "X is 75% done" → set_task_progress
- "Generate report" / "Status report" → generate_report
- "What's blocked?" / "Show blockers" → show_blockers
- "X depends on Y" / "X is blocked by Y" → add_dependency
- "Who should I assign?" / "Suggest assignee" → suggest_assignee
- "Show activity" / "What happened today" → get_activity_feed
- "Project summary" / "Health check" → cross_project_summary'''
code = code.replace(OLD_RULES, NEW_RULES)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

import re
tools = len(re.findall(r'@function_tool\(\)', code))
print(f"✓ agent.py patched — {tools} tools total")
