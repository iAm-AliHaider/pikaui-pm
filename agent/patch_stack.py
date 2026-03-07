"""Patch agent.py: swap free local stack → Taliq proven stack (Deepgram + GPT-4o-mini + Kokoro)."""

path = "agent.py"
with open(path, "r", encoding="utf-8") as f:
    src = f.read()

old = """from livekit.plugins import openai, silero"""
new = """from livekit.plugins import deepgram, openai, silero"""
src = src.replace(old, new)

old = """    # ── 100% FREE stack ──────────────────────────────
    stt = openai.STT(
        model="deepdml/faster-whisper-large-v3-turbo-ct2",
        base_url="http://localhost:8000/v1",
        api_key="not-needed",
    )
    llm = openai.LLM(
        model="google/gemma-3-12b",
        base_url="http://localhost:1234/v1",
        api_key="not-needed",
    )
    tts = openai.TTS(
        model="speaches-ai/Kokoro-82M-v1.0-ONNX",
        voice="af_heart",
        base_url="http://localhost:8000/v1",
        api_key="not-needed",
    )"""

new = """    # ── Taliq proven stack ───────────────────────────
    stt = deepgram.STT(model="nova-3", language="en")
    llm = openai.LLM(model="gpt-4o-mini")
    tts = openai.TTS(
        model="speaches-ai/Kokoro-82M-v1.0-ONNX",
        voice="af_heart",
        base_url="http://localhost:8000/v1",
        api_key="not-needed",
    )"""

src = src.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Patched OK")
# Verify
assert "deepgram.STT" in src
assert "gpt-4o-mini" in src
assert "Kokoro" in src
print("Assertions passed")
