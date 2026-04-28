import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Normally fetched from environment variable
# Use placeholder or localhost:5432
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:shrutiraina2910@localhost:5432/druginteractionvault")
engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
