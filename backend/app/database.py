from functools import lru_cache
from pymongo import MongoClient
from pymongo.database import Database
from app.config import settings

@lru_cache
def get_mongo_client() -> MongoClient:
    return MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
    )

def get_database() -> Database:
    client = get_mongo_client()
    return client[settings.mongodb_database]

def close_database_connection() -> None:
    get_mongo_client().close()
    get_mongo_client.cache_clear()

