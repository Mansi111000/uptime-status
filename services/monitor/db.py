# services/monitor/db.py
import os, time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set for monitor service")

def wait_for_db(url: str, attempts=30, delay=2):
    last = None
    for i in range(1, attempts + 1):
        try:
            eng = create_engine(url, pool_pre_ping=True, future=True)
            with eng.connect() as c:
                c.execute(text("SELECT 1"))
            print(f"[monitor] DB ready after {i} attempt(s).")
            return eng
        except OperationalError as e:
            last = e
            print(f"[monitor] DB not ready ({e}); retry {i}/{attempts} in {delay}s…")
            time.sleep(delay)
    raise RuntimeError(f"DB never became ready: {last}")

engine = wait_for_db(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

class Base(DeclarativeBase):
    pass
