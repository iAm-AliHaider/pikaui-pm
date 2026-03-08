"""
Lightweight text-to-SQL for pikaui-pm voice agent.
Uses OpenAI gpt-4o-mini with few-shot schema context.
No external vector DB needed — schema + examples are embedded as context.

Usage:
    from text_to_sql import ask_database
    result = await ask_database(pool, question, openai_api_key)
"""

import json
import re
import logging

logger = logging.getLogger("pikaui-pm")

# --- Schema context injected into every prompt ---
SCHEMA_CONTEXT = """
You are a SQL expert for a project management database. Schema (all tables in pikaui schema):

pikaui.users          - id, name, role (job title), department, system_role (admin/manager/member), hourly_rate, is_active
pikaui.projects       - id, name, description, status (active/planning/closed), color, deadline, budget, manager_id
pikaui.tasks          - id, project_id, title, status (todo/in_progress/done), priority (low/medium/high),
                        assignee_id, progress_pct (0-100), hours_estimated, hours_worked, start_date, due_date
pikaui.time_logs      - id, task_id, project_id, user_id, hours, log_date, note
pikaui.milestones     - id, project_id, name, due_date, status (pending/achieved/missed)
pikaui.sprints        - id, project_id, name, start_date, end_date, status (planned/active/completed)
pikaui.activity_log   - id, project_id, task_id, user_name, action, entity_type, entity_name, created_at

Key rules:
- Always use pikaui. schema prefix
- Only write SELECT statements — never INSERT, UPDATE, DELETE, DROP, ALTER
- CURRENT_DATE and NOW() are available for date comparisons
- For overdue: due_date < CURRENT_DATE AND status != 'done'
- For this week: log_date >= date_trunc('week', CURRENT_DATE)
- Join users via assignee_id for task assignee name
- is_active = true filters to active users only
"""

FEW_SHOT_EXAMPLES = [
    {"q": "How many tasks are overdue?",
     "sql": "SELECT COUNT(*) as overdue_count FROM pikaui.tasks WHERE due_date < CURRENT_DATE AND status != 'done'"},

    {"q": "Who has the most tasks assigned?",
     "sql": "SELECT u.name, COUNT(t.id) as task_count FROM pikaui.users u LEFT JOIN pikaui.tasks t ON t.assignee_id = u.id WHERE u.is_active = true GROUP BY u.name ORDER BY task_count DESC LIMIT 5"},

    {"q": "What tasks are in progress?",
     "sql": "SELECT t.title, u.name as assignee, p.name as project FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.status = 'in_progress' ORDER BY t.updated_at DESC"},

    {"q": "Show high priority unfinished tasks",
     "sql": "SELECT t.title, t.status, u.name as assignee, t.due_date FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id WHERE t.priority = 'high' AND t.status != 'done' ORDER BY t.due_date NULLS LAST"},

    {"q": "How many hours has each person logged this week?",
     "sql": "SELECT u.name, COALESCE(SUM(tl.hours), 0) as hours FROM pikaui.users u LEFT JOIN pikaui.time_logs tl ON tl.user_id = u.id AND tl.log_date >= date_trunc('week', CURRENT_DATE) WHERE u.is_active = true GROUP BY u.name ORDER BY hours DESC"},

    {"q": "What tasks have no assignee?",
     "sql": "SELECT t.title, p.name as project, t.priority FROM pikaui.tasks t LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.assignee_id IS NULL AND t.status != 'done'"},

    {"q": "What is the completion rate of each project?",
     "sql": "SELECT p.name, COUNT(t.id) as total, COUNT(t.id) FILTER (WHERE t.status='done') as done, ROUND(COUNT(t.id) FILTER (WHERE t.status='done') * 100.0 / NULLIF(COUNT(t.id),0), 1) as pct FROM pikaui.projects p LEFT JOIN pikaui.tasks t ON t.project_id = p.id GROUP BY p.name ORDER BY pct DESC"},

    {"q": "Which tasks have not been updated in 5 days?",
     "sql": "SELECT t.title, t.status, u.name as assignee, t.updated_at FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id WHERE t.updated_at < NOW() - INTERVAL '5 days' AND t.status != 'done' ORDER BY t.updated_at ASC"},

    {"q": "How much budget has been spent per project?",
     "sql": "SELECT p.name, COALESCE(p.budget,0) as budget, COALESCE(SUM(tl.hours * COALESCE(u.hourly_rate,75)),0) as spent FROM pikaui.projects p LEFT JOIN pikaui.time_logs tl ON tl.project_id = p.id LEFT JOIN pikaui.users u ON tl.user_id = u.id GROUP BY p.name, p.budget ORDER BY spent DESC"},

    {"q": "Show tasks completed today",
     "sql": "SELECT t.title, u.name as assignee, p.name as project FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.status = 'done' AND t.updated_at::date = CURRENT_DATE"},
]


def _is_safe_sql(sql: str) -> bool:
    """Only allow SELECT statements. Block all mutations."""
    clean = re.sub(r'--[^\n]*', '', sql).strip().upper()
    if not clean.startswith("SELECT"):
        return False
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
                 "CREATE", "GRANT", "REVOKE", "EXEC", "EXECUTE", "COPY"]
    return not any(f" {kw} " in f" {clean} " for kw in forbidden)


def _build_prompt(question: str) -> list:
    examples_text = "\n".join(
        f"Q: {ex['q']}\nSQL: {ex['sql']}" for ex in FEW_SHOT_EXAMPLES
    )
    return [
        {"role": "system", "content": (
            SCHEMA_CONTEXT + "\n\n"
            "Examples:\n" + examples_text + "\n\n"
            "Rules:\n"
            "- Return ONLY the SQL query, no explanation, no markdown fences\n"
            "- Always use pikaui. prefix on all tables\n"
            "- Only SELECT statements\n"
            "- Keep results focused: LIMIT 10 for lists\n"
        )},
        {"role": "user", "content": f"Q: {question}\nSQL:"},
    ]


def _summarize_rows(rows: list, question: str) -> str:
    """Convert DB rows to a concise voice-friendly answer (1-3 sentences)."""
    if not rows:
        return "No results found for that question."

    count = len(rows)
    cols = list(rows[0].keys()) if rows else []

    # Single value (COUNT, SUM, etc.)
    if count == 1 and len(cols) == 1:
        val = list(rows[0].values())[0]
        return f"The answer is {val}."

    # Name + count pattern
    if count == 1 and len(cols) == 2:
        k, v = list(rows[0].items())
        return f"{k[1]}: {v[1]}."

    # Small result set — describe each row
    if count <= 3:
        lines = []
        for row in rows:
            pairs = [f"{v}" for v in row.values() if v is not None]
            lines.append(", ".join(str(p) for p in pairs[:3]))
        return ". ".join(lines) + "."

    # Larger result — summarize first column values
    first_col = cols[0]
    top = [str(r[first_col]) for r in rows[:3] if r[first_col] is not None]
    suffix = f" and {count - 3} more" if count > 3 else ""
    return f"Found {count} results. Top: {', '.join(top)}{suffix}."


async def ask_database(pool, question: str, openai_api_key: str) -> str:
    """
    Main entry point. Convert a natural language question to SQL,
    run it safely, and return a voice-friendly summary.

    Args:
        pool: asyncpg connection pool (must have search_path set to pikaui)
        question: Natural language question from the user
        openai_api_key: OpenAI API key

    Returns:
        Plain-language answer string (1-3 sentences, safe for TTS)
    """
    import asyncio
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=openai_api_key)

    try:
        # 1. Generate SQL
        messages = _build_prompt(question)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0,
            max_tokens=300,
        )
        sql = resp.choices[0].message.content.strip()

        # Strip markdown fences if model added them anyway
        sql = re.sub(r"```(?:sql)?", "", sql, flags=re.IGNORECASE).strip("`").strip()

        logger.info(f"ask_database generated SQL: {sql[:120]}")

        # 2. Safety check
        if not _is_safe_sql(sql):
            logger.warning(f"ask_database blocked unsafe SQL: {sql[:80]}")
            return "I can only answer read-only questions about the project data."

        # 3. Run query
        async with pool.acquire() as conn:
            rows = await conn.fetch(sql)
            rows = [dict(r) for r in rows]

        # 4. Summarize
        return _summarize_rows(rows, question)

    except Exception as e:
        logger.error(f"ask_database error: {e}")
        return f"I couldn't answer that: {str(e)[:100]}"
