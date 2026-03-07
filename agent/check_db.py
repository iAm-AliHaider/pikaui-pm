import asyncio, asyncpg
DATABASE_URL = "postgresql://neondb_owner:npg_laesRAW8Dui1@ep-plain-sound-aib5z9bz-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    r = await conn.fetch("SELECT name, status FROM pikaui.projects")
    print("Projects:", [(x['name'], x['status']) for x in r])
    r = await conn.fetch("SELECT COUNT(*) as n FROM pikaui.tasks")
    print("Task count:", r[0]['n'])
    r = await conn.fetch("SELECT COUNT(*) as n FROM pikaui.users")
    print("User count:", r[0]['n'])
    await conn.close()

asyncio.run(main())
