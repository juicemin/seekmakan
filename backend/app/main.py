from fastapi import FastAPI
from pymongo.errors import PyMongoError
from app.database import database 
from app.routers.restaurants import router as restaurant_router

app = FastAPI(
    title = "SeekMakan API",
    description = "Backend API for SeekMakan",
    version = "0.139.2",
)

app.include_router(restaurant_router)

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to SeekMakan API!"}

@app.get("/health")
def health_check() -> dict[str, str]:
    try:
        database.command("ping")
        return{
            "status": "healthy",
            "database": "connected",
        }
    except PyMongoError:
        return{
            "status": "degraded",
            "database": "disconnected",
        }


