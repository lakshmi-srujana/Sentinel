from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import create_tables
from app.auth.router import router as auth_router

app = FastAPI(
    title="Sentinel",
    description="Enterprise AI Safety & Intelligence Platform",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def startup():
    create_tables()

# Mount routers
app.include_router(auth_router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "sentinel"}