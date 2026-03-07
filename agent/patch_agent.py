"""Patch pikaui-pm agent to use pikaui schema"""
content = open("agent.py", encoding="utf-8").read()

old = "async def get_db_pool():\n    return await asyncpg.create_pool(DATABASE_URL)"
new = 'async def get_db_pool():\n    return await asyncpg.create_pool(DATABASE_URL, server_settings={"search_path": "pikaui"})'

if old in content:
    content = content.replace(old, new, 1)
    open("agent.py", "w", encoding="utf-8").write(content)
    print("PATCHED: get_db_pool now uses pikaui schema")
else:
    print("NOT FOUND - current:")
    idx = content.find("get_db_pool")
    print(repr(content[idx:idx+120]))
