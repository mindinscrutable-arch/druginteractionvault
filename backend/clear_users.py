from dotenv import load_dotenv
import os
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def clear_users():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("Clearing all users...")
        conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE;"))
        conn.commit()
        print("Done. All registrations cleared.")

if __name__ == "__main__":
    clear_users()
