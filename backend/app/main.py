from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import create_tables, get_db
from app.auth.router import router as auth_router
from app.gateway.router import router as gateway_router
from app.dashboard.router import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    create_tables()
    yield
    # Shutdown tasks

app = FastAPI(
    title="Sentinel",
    description="Enterprise AI Governance & Safety Intelligence Platform",
    version="0.2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(auth_router)
app.include_router(gateway_router)
app.include_router(dashboard_router)

@app.get("/health")
def health(db: Session = Depends(get_db)):
    """Health check endpoint validating service and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "sentinel",
        "version": "0.2.0",
        "database": db_status
    }