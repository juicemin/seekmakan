from fastapi import FastAPI, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.database import get_database

from app.routers.restaurants import router as restaurant_router
from app.config import settings

app = FastAPI(
    title = "SeekMakan API",
    description = "Backend API for SeekMakan",
    version = "0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.allowed_origins,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(restaurant_router)

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to SeekMakan API!"}

@app.get("/health/live")
def liveness_check() -> dict[str, str]:
    return {"status": "alive"}

@app.get("/health/ready")
def readiness_check(
    response: Response,
    database: Database = Depends(get_database),
) -> dict[str, str]:
    try:
        database.command("ping")

        return {
            "status": "ready",
            "database": "connected",
        }
    except PyMongoError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        return {
            "status": "not_ready",
            "database": "disconnected",
        }

