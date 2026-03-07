import asyncio, asyncpg

DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def main():
    conn = await asyncpg.connect(DATABASE_URL, server_settings={"search_path": "pikaui"})

    # Check projects columns
    cols = await conn.fetch("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='pikaui' AND table_name='projects'
        ORDER BY ordinal_position
    """)
    print("pikaui.projects columns:")
    for c in cols: print(f"  {c['column_name']}: {c['data_type']}")

    print()
    cols = await conn.fetch("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema='pikaui' AND table_name='tasks'
        ORDER BY ordinal_position
    """)
    print("pikaui.tasks columns:")
    for c in cols: print(f"  {c['column_name']}: {c['data_type']}")

    await conn.close()

asyncio.run(main())
