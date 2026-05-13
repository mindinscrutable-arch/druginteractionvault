from dotenv import load_dotenv
load_dotenv()  # Must run before any module that reads environment variables

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.api.auth import router as auth_router
from app.database import engine
from app.models import Base

# In a production setting, you'd use Alembic. For quick demo/start:
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DrugInteraction Vault API",
    description="3NF-compliant clinical decision support system for preventing dangerous drug-drug interactions.",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server and any production origin listed in .env
# Set ALLOWED_ORIGINS="https://your-prod-domain.com" in production
# ---------------------------------------------------------------------------
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1/auth")

@app.get("/health")
def health_check():
    return {"status": "ok", "allowed_origins": ALLOWED_ORIGINS}
