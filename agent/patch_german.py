"""Patch agent.py to support German language via job metadata."""
import re

path = r"C:\Users\AI\.openclaw\workspace\pikaui-pm\agent\agent.py"
content = open(path, encoding="utf-8", errors="replace").read()

# ── 1. Add edge_tts import after existing imports ─────────────────────────────
old_imports = "from livekit.plugins import deepgram, openai, silero"
new_imports = (
    "from livekit.plugins import deepgram, openai, silero\n"
    "try:\n"
    "    from livekit.plugins import azure as lk_azure\n"
    "    _HAS_AZURE = True\n"
    "except ImportError:\n"
    "    _HAS_AZURE = False"
)
if old_imports in content:
    content = content.replace(old_imports, new_imports, 1)
    print("Step 1: imports patched")
else:
    print("Step 1 SKIPPED: imports already patched or pattern not found")

# ── 2. Add German SYSTEM_PROMPT after existing SYSTEM_PROMPT ─────────────────
system_prompt_end_marker = '- Confirm actions briefly: "Done — 3 hours logged on the data channel task."\n"""'

german_prompt = '''
SYSTEM_PROMPT_DE = """Sie sind PlanBot, ein KI-Projektmanagement-Assistent.

ANWEISUNGEN:
- Antworten Sie IMMER auf Deutsch, kurz und präzise (1-2 Sätze).
- Rufen Sie immer das passende Tool auf — beschreiben Sie Aktionen nie nur.
- "Zeig das Board" → show_board
- "Tagesstandup" / "Was machen wir heute?" → daily_standup
- "Risiken erkennen" → detect_risks
- "Aufgabe erstellen" → create_task
- "Wer ist überlastet?" → get_team_workload
- "3 Stunden auf X buchen" → log_hours
- "Fortschritt auf 75% setzen" → set_task_progress
- "Bericht erstellen" → generate_report
- "Was ist blockiert?" → show_blockers
- "Meilensteine anzeigen" → show_milestones
- "Aktivität anzeigen" → get_activity_feed
- "Projektübersicht" → cross_project_summary
- Bestätigen Sie Aktionen kurz auf Deutsch: "Erledigt — 3 Stunden auf die Aufgabe gebucht."
"""
'''

if system_prompt_end_marker in content:
    content = content.replace(
        system_prompt_end_marker,
        system_prompt_end_marker + "\n" + german_prompt,
        1
    )
    print("Step 2: German system prompt added")
else:
    print("Step 2 SKIPPED: marker not found")

# ── 3. Replace entrypoint to be language-aware ────────────────────────────────
old_entrypoint = '''async def entrypoint(ctx: JobContext):
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
    )'''

new_entrypoint = '''async def entrypoint(ctx: JobContext):
    global _room_ref
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    _room_ref = ctx.room
    logger.info(f"Connected: {ctx.room.name}")

    # ── Detect language from dispatch metadata ────────────────────────────────
    lang = "en"
    try:
        meta_raw = ctx.job.metadata or ""
        if meta_raw:
            meta = json.loads(meta_raw)
            lang = meta.get("lang", "en")
    except Exception:
        pass
    logger.info(f"Language: {lang}")

    # ── Configure STT ─────────────────────────────────────────────────────────
    stt_lang = "de" if lang == "de" else "en"
    stt = deepgram.STT(model="nova-3", language=stt_lang)

    # ── Configure TTS ─────────────────────────────────────────────────────────
    if lang == "de":
        # OpenAI TTS speaks natively in any language the text is in
        tts = openai.TTS(model="tts-1", voice="nova")
    else:
        tts = openai.TTS(
            model="speaches-ai/Kokoro-82M-v1.0-ONNX",
            voice="af_heart",
            base_url="http://localhost:8000/v1",
            api_key="not-needed",
        )

    # ── Configure agent instructions ─────────────────────────────────────────
    instructions = SYSTEM_PROMPT_DE if lang == "de" else SYSTEM_PROMPT

    class LocalizedPMAgent(Agent):
        def __init__(self):
            super().__init__(
                instructions=instructions,
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

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=stt,
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=tts,
    )

    await session.start(room=ctx.room, agent=LocalizedPMAgent())

    if lang == "de":
        await session.say(
            "Hallo! Ich bin PlanBot. Sagen Sie 'Board anzeigen', 'Tagesstandup', 'Risiken erkennen' oder 'Meilensteine anzeigen'.",
            allow_interruptions=True,
        )
    else:
        await session.say(
            "Hey! I'm PlanBot. Say 'show board', 'daily standup', 'detect risks', or 'show milestones' to get started.",
            allow_interruptions=True,
        )'''

if old_entrypoint in content:
    content = content.replace(old_entrypoint, new_entrypoint, 1)
    print("Step 3: Entrypoint patched for language-aware routing")
else:
    print("Step 3 SKIPPED: entrypoint pattern not found")

# ── 4. Remove old PMAgent class (now replaced by LocalizedPMAgent inline) ────
old_agent_class = '''class PMAgent(Agent):
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
        )'''

if old_agent_class in content:
    content = content.replace(old_agent_class, "# PMAgent replaced by LocalizedPMAgent in entrypoint", 1)
    print("Step 4: Old PMAgent class removed")
else:
    print("Step 4 SKIPPED: PMAgent class not found")

# ── Validate and save ─────────────────────────────────────────────────────────
import ast
try:
    ast.parse(content)
    open(path, "w", encoding="utf-8").write(content)
    print("SUCCESS: agent.py saved and syntax is valid")
except SyntaxError as e:
    print(f"SYNTAX ERROR — not saved: {e}")
