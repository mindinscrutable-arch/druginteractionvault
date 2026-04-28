from fastapi import FastAPI
from app.api.endpoints import router as api_router
from app.database import engine
from app.models import Base

# In a production setting, you'd use Alembic. For quick demo/start:
# Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DrugInteraction Vault API",
    description="3NF-compliant clinical decision support system for preventing dangerous drug compatibility issues.",
    version="1.0.0"
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok"}
