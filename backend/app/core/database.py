import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("app.core.database")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB Atlas...")
    db_instance.client = AsyncIOMotorClient(settings.sanitized_mongodb_url, serverSelectionTimeoutMS=5000)
    db_instance.db = db_instance.client[settings.DATABASE_NAME]
    logger.info(f"Connected to database: {settings.DATABASE_NAME}")
    
    # Ensure indexes
    try:
        db = db_instance.db
        await db.users.create_index("email", unique=True)
        await db.facilities.create_index("owner_user_id")
        await db.assessments.create_index("facility_id")
        await db.assessments.create_index("owner_user_id")
        await db.process_inputs.create_index("assessment_id")
        await db.emission_factors.create_index([("category", 1), ("subtype", 1), ("unit", 1)], unique=True)
        await db.recommendations.create_index("assessment_id")
        await db.applied_interventions.create_index("assessment_id")
        await db.assessment_history.create_index("facility_id")
        logger.info("MongoDB collection indexes created successfully.")
    except Exception as e:
        logger.warning(f"Error initializing indexes: {e}")

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()

def get_database() -> AsyncIOMotorDatabase:
    if db_instance.db is None:
        db_instance.client = AsyncIOMotorClient(settings.sanitized_mongodb_url, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
    return db_instance.db
