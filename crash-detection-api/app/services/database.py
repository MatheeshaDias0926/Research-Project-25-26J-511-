from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
import logging
import dns.resolver

logger = logging.getLogger(__name__)

dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_mongo():
    """Create database connection"""
    settings = get_settings()
    try:
        db.client = AsyncIOMotorClient(
            settings.mongo_uri,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000
        )
        db.db = db.client[settings.database_name]
        logger.info(f"Connected to MongoDB database: {settings.database_name}")

        await db.client.admin.command('ping')
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.warning(f"Failed to connect to MongoDB: {e}")
        logger.warning("Server will continue without MongoDB. Crash events will not be stored.")
        db.client = None
        db.db = None


async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")


async def get_database():
    """Get database instance"""
    return db.db
