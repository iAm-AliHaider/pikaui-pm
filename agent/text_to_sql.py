"""
Natural Language to SQL for pikaui-pm voice agent.

Enhancements:
  1. Auto-schema discovery  — builds SCHEMA_CONTEXT from information_schema at startup
  2. SQL logging            — every Q&A appended to sql_learning_log.jsonl for review
  3. Result passthrough     — returns (voice_text, rows, columns) for DataTable widget
  4. Correction loop        — retry_with_correction() uses last failed query as context

Usage:
    from text_to_sql import build_schema_context, ask_database_full, retry_with_correction

    await build_schema_context(pool)           # once at startup
    voice, rows, cols = await ask_database_full(pool, question, openai_api_key)
    if rows: send_datatable(rows, cols)
"""

import json
import re
import logging
import datetime
from pathlib import Path

logger = logging.getLogger("pikaui-pm")

# ── Module-level state ────────────────────────────────────────────────────────

_schema_context: str = ""          # Auto-discovered at startup; falls back to static
_last_query: dict = {              # Persisted for correction loop
    "question": None,
    "sql":      None,
    "error":    None,
    "rows":     0,
}

LOG_FILE = Path(__file__).parent / "sql_learning_log.jsonl"

# ── Static fallback schema (used before pool is ready) ───────────────────────

_STATIC_SCHEMA = """
pikaui.users       — id, name, role, department, system_role (admin/manager/member), hourly_rate, is_active
pikaui.projects    — id, name, status (active/planning/closed), color, deadline, budget, manager_id
pikaui.tasks       — id, project_id, title, status (todo/in_progress/done), priority (low/medium/high),
                     assignee_id, progress_pct (0-100), hours_estimated, hours_worked, start_date, due_date, updated_at
pikaui.time_logs   — id, task_id, project_id, user_id, hours, log_date, note
pikaui.milestones  — id, project_id, name, due_date, status (pending/achieved/missed)
pikaui.sprints     — id, project_id, name, start_date, end_date, status (planned/active/completed)
pikaui.activity_log — id, project_id, task_id, user_name, action, entity_type, entity_name, created_at
""".strip()

FEW_SHOT_EXAMPLES = [
    {"q": "How many tasks are overdue?",
     "sql": "SELECT COUNT(*) AS overdue_count FROM pikaui.tasks WHERE due_date < CURRENT_DATE AND status != 'done'"},

    {"q": "Who has the most tasks assigned?",
     "sql": "SELECT u.name, COUNT(t.id) AS task_count FROM pikaui.users u LEFT JOIN pikaui.tasks t ON t.assignee_id = u.id WHERE u.is_active = true GROUP BY u.name ORDER BY task_count DESC LIMIT 5"},

    {"q": "What tasks are in progress?",
     "sql": "SELECT t.title, u.name AS assignee, p.name AS project FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.status = 'in_progress' ORDER BY t.updated_at DESC LIMIT 10"},

    {"q": "Show high priority unfinished tasks",
     "sql": "SELECT t.title, t.status, u.name AS assignee, t.due_date FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id WHERE t.priority = 'high' AND t.status != 'done' ORDER BY t.due_date NULLS LAST"},

    {"q": "How many hours has each person logged this week?",
     "sql": "SELECT u.name, COALESCE(SUM(tl.hours), 0) AS hours FROM pikaui.users u LEFT JOIN pikaui.time_logs tl ON tl.user_id = u.id AND tl.log_date >= date_trunc('week', CURRENT_DATE) WHERE u.is_active = true GROUP BY u.name ORDER BY hours DESC"},

    {"q": "What tasks have no assignee?",
     "sql": "SELECT t.title, p.name AS project, t.priority FROM pikaui.tasks t LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.assignee_id IS NULL AND t.status != 'done'"},

    {"q": "What is the completion rate of each project?",
     "sql": "SELECT p.name, COUNT(t.id) AS total, COUNT(t.id) FILTER (WHERE t.status='done') AS done, ROUND(COUNT(t.id) FILTER (WHERE t.status='done') * 100.0 / NULLIF(COUNT(t.id),0), 1) AS pct FROM pikaui.projects p LEFT JOIN pikaui.tasks t ON t.project_id = p.id GROUP BY p.name ORDER BY pct DESC"},

    {"q": "Which tasks have not been updated in 5 days?",
     "sql": "SELECT t.title, t.status, u.name AS assignee, t.updated_at FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id WHERE t.updated_at < NOW() - INTERVAL '5 days' AND t.status != 'done' ORDER BY t.updated_at ASC LIMIT 10"},

    {"q": "How much budget has been spent per project?",
     "sql": "SELECT p.name, COALESCE(p.budget,0) AS budget, COALESCE(SUM(tl.hours * COALESCE(u.hourly_rate,75)),0) AS spent FROM pikaui.projects p LEFT JOIN pikaui.time_logs tl ON tl.project_id = p.id LEFT JOIN pikaui.users u ON tl.user_id = u.id GROUP BY p.name, p.budget ORDER BY spent DESC"},

    {"q": "Show tasks completed today",
     "sql": "SELECT t.title, u.name AS assignee, p.name AS project FROM pikaui.tasks t LEFT JOIN pikaui.users u ON t.assignee_id = u.id LEFT JOIN pikaui.projects p ON t.project_id = p.id WHERE t.status = 'done' AND t.updated_at::date = CURRENT_DATE"},

    {"q": "Who logged time yesterday?",
     "sql": "SELECT u.name, SUM(tl.hours) AS hours FROM pikaui.time_logs tl JOIN pikaui.users u ON tl.user_id = u.id WHERE tl.log_date = CURRENT_DATE - 1 GROUP BY u.name ORDER BY hours DESC"},

    {"q": "Show upcoming milestones this month",
     "sql": "SELECT m.name, m.due_date, p.name AS project, m.status FROM pikaui.milestones m JOIN pikaui.projects p ON m.project_id = p.id WHERE m.due_date <= CURRENT_DATE + INTERVAL '30 days' AND m.status = 'pending' ORDER BY m.due_date"},
]

# ── 1. Auto-schema discovery ──────────────────────────────────────────────────

async def build_schema_context(pool) -> str:
    """
    Query information_schema to auto-build SCHEMA_CONTEXT.
    Call once at agent startup. Falls back to _STATIC_SCHEMA on error.
    Updates module-level _schema_context so all tool calls use the fresh version.
    """
    global _schema_context
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT table_name, column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'pikaui'
                ORDER BY table_name, ordinal_position
            """)

        if not rows:
            _schema_context = _STATIC_SCHEMA
            logger.warning("build_schema_context: no rows returned, using static schema")
            return _schema_context

        # Group by table
        tables: dict[str, list[str]] = {}
        for row in rows:
            t = row["table_name"]
            col = row["column_name"]
            dtype = row["data_type"]
            nullable = "" if row["is_nullable"] == "NO" else "?"
            tables.setdefault(t, []).append(f"{col} ({dtype}{nullable})")

        lines = ["Database schema (pikaui schema, Postgres):"]
        for tname, cols in sorted(tables.items()):
            col_str = ", ".join(cols)
            lines.append(f"  pikaui.{tname}: {col_str}")

        _schema_context = "\n".join(lines)
        logger.info(f"build_schema_context: discovered {len(tables)} tables, {len(rows)} columns")
        return _schema_context

    except Exception as e:
        logger.error(f"build_schema_context error: {e} — using static fallback")
        _schema_context = _STATIC_SCHEMA
        return _schema_context


def get_schema_context() -> str:
    """Return discovered schema, or static fallback if not yet discovered."""
    return _schema_context if _schema_context else _STATIC_SCHEMA


# ── Safety check ─────────────────────────────────────────────────────────────

def _is_safe_sql(sql: str) -> bool:
    """Only allow SELECT statements. Block all mutations."""
    clean = re.sub(r'--[^\n]*', '', sql).strip().upper()
    if not clean.startswith("SELECT"):
        return False
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE",
                 "CREATE", "GRANT", "REVOKE", "EXEC", "EXECUTE", "COPY"]
    return not any(f" {kw} " in f" {clean} " for kw in forbidden)


# ── Prompt builder ────────────────────────────────────────────────────────────

def _build_prompt(question: str, extra_context: str = "") -> list:
    examples_text = "\n".join(
        f"Q: {ex['q']}\nSQL: {ex['sql']}" for ex in FEW_SHOT_EXAMPLES
    )
    schema = get_schema_context()
    system = (
        "You are a SQL expert. Convert natural language questions to Postgres SQL.\n\n"
        f"SCHEMA:\n{schema}\n\n"
        f"EXAMPLES:\n{examples_text}\n\n"
        + (f"ADDITIONAL CONTEXT:\n{extra_context}\n\n" if extra_context else "")
        + "RULES:\n"
        "- Return ONLY the SQL query — no explanation, no markdown fences\n"
        "- Always prefix tables with pikaui. schema\n"
        "- Only SELECT statements allowed\n"
        "- Limit lists to 10 rows max unless asked for more\n"
        "- Use CURRENT_DATE and NOW() for date comparisons\n"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Q: {question}\nSQL:"},
    ]


# ── Result summarization (voice-optimized) ────────────────────────────────────

def _summarize_rows(rows: list, columns: list) -> str:
    """Convert DB rows to 1-3 sentence voice-friendly answer."""
    if not rows:
        return "No results found for that question."

    count = len(rows)

    # Single value (COUNT, SUM, AVG)
    if count == 1 and len(columns) == 1:
        val = rows[0][0]
        return f"The answer is {val}."

    # Two-column single row (label: value)
    if count == 1 and len(columns) == 2:
        return f"{columns[0]}: {rows[0][0]}, {columns[1]}: {rows[0][1]}."

    # Small result — list each row's first two values
    if count <= 3:
        lines = []
        for row in rows:
            parts = [str(v) for v in row[:3] if v is not None]
            lines.append(", ".join(parts))
        return ". ".join(lines) + "."

    # Larger result — top 3 + total
    first_col_vals = [str(r[0]) for r in rows[:3] if r[0] is not None]
    extra = f" and {count - 3} more" if count > 3 else ""
    return f"Found {count} results. Top: {', '.join(first_col_vals)}{extra}."


# ── 3. SQL logging ────────────────────────────────────────────────────────────

def _log_query(question: str, sql: str, row_count: int, error: str | None = None):
    """Append Q&A pair to sql_learning_log.jsonl for review and future training."""
    try:
        entry = {
            "ts":        datetime.datetime.utcnow().isoformat(),
            "question":  question,
            "sql":       sql,
            "row_count": row_count,
            "error":     error,
        }
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.warning(f"_log_query write failed: {e}")


# ── Core: ask_database_full ───────────────────────────────────────────────────

async def ask_database_full(
    pool,
    question: str,
    openai_api_key: str,
    extra_context: str = "",
) -> tuple[str, list[list], list[str]]:
    """
    Convert a natural language question to SQL, run it, log it.
    Returns: (voice_text, rows_as_lists, column_names)
    The caller can send rows+columns as a DataTable widget to the frontend.
    """
    global _last_query
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=openai_api_key)

    sql = ""
    try:
        # Generate SQL
        messages = _build_prompt(question, extra_context)
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0,
            max_tokens=400,
        )
        sql = resp.choices[0].message.content.strip()
        sql = re.sub(r"```(?:sql)?", "", sql, flags=re.IGNORECASE).strip("`").strip()

        logger.info(f"ask_database SQL: {sql[:120]}")

        # Safety gate
        if not _is_safe_sql(sql):
            logger.warning(f"ask_database blocked: {sql[:80]}")
            _last_query = {"question": question, "sql": sql, "error": "blocked", "rows": 0}
            return "I can only answer read-only questions about project data.", [], []

        # Run query
        async with pool.acquire() as conn:
            db_rows = await conn.fetch(sql)

        columns = list(db_rows[0].keys()) if db_rows else []
        rows    = [list(r.values()) for r in db_rows]

        # Serialize non-JSON-safe types (dates, decimals, etc.)
        def _safe(v):
            if hasattr(v, "isoformat"):
                return v.isoformat()
            if hasattr(v, "__float__"):
                return float(v)
            return v

        rows = [[_safe(v) for v in row] for row in rows]

        voice_text = _summarize_rows(rows, columns)

        # Update last query for correction loop
        _last_query = {"question": question, "sql": sql, "error": None, "rows": len(rows)}

        # Log
        _log_query(question, sql, len(rows))

        return voice_text, rows, columns

    except Exception as e:
        err_str = str(e)[:200]
        logger.error(f"ask_database error: {err_str}")
        _last_query = {"question": question, "sql": sql, "error": err_str, "rows": 0}
        _log_query(question, sql, 0, error=err_str)
        return f"I couldn't answer that. {err_str[:80]}", [], []


# ── 4. Correction feedback loop ───────────────────────────────────────────────

async def retry_with_correction(
    pool,
    hint: str,
    openai_api_key: str,
) -> tuple[str, list[list], list[str]]:
    """
    Retry the last query with a correction hint.
    Uses the failed question + SQL as additional context for self-correction.
    """
    if not _last_query.get("question"):
        return "I don't have a previous query to correct.", [], []

    extra = (
        f"The previous attempt for this question generated the following SQL:\n"
        f"{_last_query['sql']}\n"
        f"That was wrong. Correction hint: {hint}\n"
        f"Generate a corrected SQL query."
    )
    return await ask_database_full(
        pool,
        _last_query["question"],
        openai_api_key,
        extra_context=extra,
    )


# ── Compat shim (keeps old import working) ────────────────────────────────────

async def ask_database(pool, question: str, openai_api_key: str) -> str:
    """Backward-compatible wrapper. Returns only voice text."""
    voice, _, _ = await ask_database_full(pool, question, openai_api_key)
    return voice
