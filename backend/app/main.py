from fastapi import FastAPI

from app.api.router import router
from app.core.config import settings


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-powered Procurement Intelligence "
        "and Execution Platform for Global EPC organizations."
    ),
)


app.include_router(
    router,
    prefix="/api/v1",
)


@app.get("/")
async def root():
    return {
        "application": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "status": "running",
    }