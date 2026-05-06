from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.schema import CreateTable
from app.models import Base
from app.database import engine
import os

with open('../database/schema.sql', 'w') as f:
    for table in Base.metadata.sorted_tables:
        f.write(str(CreateTable(table).compile(engine)).strip() + ';\n\n')
