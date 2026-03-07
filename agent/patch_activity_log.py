"""Add activity logging calls into create_task, update_task_status, log_hours."""
path = "agent.py"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. In create_task — after `task = _row(row)` line, before await _send_event
OLD1 = '''    task = _row(row)
    task["assignee"] = assignee_display
    await _send_event("refresh", {"section": "tasks"})'''
NEW1 = '''    task = _row(row)
    task["assignee"] = assignee_display
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, proj["id"], None, assignee_display or "PlanBot",
                            "created", "task", title)
    await _send_event("refresh", {"section": "tasks"})'''
code = code.replace(OLD1, NEW1, 1)

# 2. In update_task_status — after checking row, before StatusBanner
OLD2 = '''    if not row:
        return f"No task matching '{task_title}'."
    label = new_status.replace("_", " ").title()
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner",'''
NEW2 = '''    if not row:
        return f"No task matching '{task_title}'."
    label = new_status.replace("_", " ").title()
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, None, None, "PlanBot",
                            "status_changed", "task", row["title"], {"to": new_status})
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner",'''
code = code.replace(OLD2, NEW2, 1)

# 3. In log_hours — after row check, before StatusBanner
OLD3 = '''    if not row:
        return f"Task '{task_title}' not found."
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner", {
        "message": f"+{hours}h logged on '{row['title']}' — {row['hours_worked']}h total ({row['progress_pct']}% done)",'''
NEW3 = '''    if not row:
        return f"Task '{task_title}' not found."
    async with (await get_pool()).acquire() as _lconn:
        await _log_activity(_lconn, None, None, "PlanBot",
                            "hours_logged", "timelog", row["title"], {"hours": hours})
    await _send_event("refresh", {"section": "tasks"})
    await _send_ui("StatusBanner", {
        "message": f"+{hours}h logged on '{row['title']}' — {row['hours_worked']}h total ({row['progress_pct']}% done)",'''
code = code.replace(OLD3, NEW3, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

# Verify
import re
calls = re.findall(r'await _log_activity\(', code)
print(f"✓ _log_activity calls: {len(calls)} (definition + {len(calls)-1} usage(s))")
