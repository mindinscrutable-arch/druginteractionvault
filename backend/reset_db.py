import os
from dotenv import load_dotenv
load_dotenv() # Load environment variables from .env

from sqlalchemy import create_engine, text
from app.models import Base
from app.database import engine, SQLALCHEMY_DATABASE_URL

def reset_db():
    print("Purging database schema...")
    
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        Base.metadata.drop_all(bind=engine)
        print("SQLite tables dropped.")
    else:
        with engine.connect() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE;"))
            conn.execute(text("CREATE SCHEMA public;"))
            conn.commit()
        print("Postgres schema purged.")

    print("Creating all tables (Strict Senior Architect Schema)...")
    Base.metadata.create_all(bind=engine)
    print("Database reset successfully.")

if __name__ == "__main__":
    reset_db()
