import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/devlens")

client = AsyncIOMotorClient(MONGODB_URI)
db = client.devlens

# Collections
sessions_collection = db.sessions
jobs_collection = db.jobs_cache
users_collection = db.users
resumes_collection = db.resumes


async def ping_db():
    """Verify MongoDB connection is alive."""
    await client.admin.command("ping")
    return True
