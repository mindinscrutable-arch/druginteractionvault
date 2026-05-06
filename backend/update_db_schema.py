import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def update_schema():
    if not DATABASE_URL:
        print("DATABASE_URL not found in .env")
        return

    # Use psycopg2 style URL if needed, but SQLAlchemy should handle postgresql+psycopg
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("Checking for missing columns in 'users' table...")
        
        # Add full_name if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(255);"))
            conn.commit()
            print("Added 'full_name' column.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("'full_name' column already exists.")
            else:
                print(f"Error adding 'full_name': {e}")

        # Add age if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN age INTEGER;"))
            conn.commit()
            print("Added 'age' column.")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("'age' column already exists.")
            else:
                print(f"Error adding 'age': {e}")

if __name__ == "__main__":
    update_schema()
