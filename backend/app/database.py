from pymongo import MongoClient
from pymongo.database import Database
from app.config import settings

client: MongoClient = MongoClient(settings.mongodb_uri)
database: Database = client[settings.mongodb_database]

def get_database() -> Database:
    return database

