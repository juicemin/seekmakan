from fastapi import FastAPI, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo.database import Database
from pymongo.errors import PyMongoError
from app.database import get_database
from app.routers.restaurants import router as restaurant_router
from app.routers.decisions import router as decision_router
from app.routers.locations import router as location_router
from app.config import settings
from app.routers.auth import router as auth_router
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse

app = FastAPI(
    title = "SeekMakan API",
    description = "Backend API for SeekMakan",
    version = "0.1.0",
)

@app.exception_handler(RequestValidationError)
async def handle_request_validation(
    request: Request,
    error: RequestValidationError,
):
    if request.url.path.startswith("/api/auth/"):
        return JSONResponse(
            status_code=422,
            content={
                "detail": [
                    {
                        "loc": list(item["loc"]),
                        "msg": item["msg"],
                        "type": item["type"],
                    }
                    for item in error.errors()
                ]
            },
        )

    return await request_validation_exception_handler(request, error)

app.add_middleware(
    CORSMiddleware,
    allow_origins = settings.allowed_origins,
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(restaurant_router)

app.include_router(decision_router)

app.include_router(location_router)

app.include_router(auth_router)

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

