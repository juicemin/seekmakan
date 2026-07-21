from fastapi import FastAPI

app = FastAPI(
    title = "SeekMakan API",
    description = "Backend API for SeekMakan",
    version = "0.139.2",
)

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Welcome to SeekMakan API!"}

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
