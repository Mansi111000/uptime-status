# services/monitor/worker.py
import os, time, json
import httpx
import redis
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError, OperationalError

from db import SessionLocal, engine, Base
from models import Monitor, Check, Incident

DB = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL") or "redis://redis:6379/0"
FAIL_THRESHOLD = int(os.getenv("FAIL_THRESHOLD", 3))
RECOVER_THRESHOLD = int(os.getenv("RECOVER_THRESHOLD", 2))
DEFAULT_INTERVAL = int(os.getenv("DEFAULT_INTERVAL_SEC", 60))
TIMEOUT_MS = int(os.getenv("CHECK_TIMEOUT_MS", 5000))

KEY_FAILS = "fails:"
KEY_PASSES = "passes:"

def wait_for_redis(url: str, attempts=60, delay=1):
    last = None
    for i in range(1, attempts + 1):
        try:
            client = redis.from_url(url)
            client.ping()
            print(f"[monitor] Redis ready after {i} attempt(s).")
            return client
        except Exception as e:
            last = e
            print(f"[monitor] Redis not ready ({e}); retry {i}/{attempts} in {delay}s…")
            time.sleep(delay)
    raise RuntimeError(f"Redis never became ready: {last}")

r = wait_for_redis(REDIS_URL)

def Session():
    return SessionLocal()

def ensure_tables_once():
    """Create tables if they don’t exist. Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)

def enqueue_alert(event: dict):
    """Push incident/recovery events to Redis queue."""
    r.lpush("alerts", json.dumps(event))

def tick_once():
    s = Session()
    try:
        mons = s.scalars(select(Monitor).where(Monitor.is_enabled == True)).all()
        now_ts = int(time.time())
        for m in mons:
            last_ts_key = f"last:{m.id}"
            last = r.get(last_ts_key)
            if last and now_ts - int(last) < (m.interval_sec or DEFAULT_INTERVAL):
                continue
            r.set(last_ts_key, str(now_ts))

            try:
                start = time.perf_counter()
                resp = httpx.request(m.method, m.url, timeout=TIMEOUT_MS/1000)
                latency = int((time.perf_counter() - start) * 1000)
                ok = resp.status_code in (m.expected_statuses or [200])
                status_code = resp.status_code
                err = None
            except Exception as e:
                latency = None
                ok = False
                status_code = None
                err = str(e)[:500]

            c = Check(
                monitor_id=m.id,
                ts=datetime.now(timezone.utc),
                status_code=status_code,
                latency_ms=latency,
                ok=ok,
                error_reason=err
            )
            s.add(c)
            s.commit()

            if ok:
                r.delete(KEY_FAILS + str(m.id))
                passes = r.incr(KEY_PASSES + str(m.id))
                open_key = f"incident_open:{m.id}"
                if r.get(open_key) and passes >= RECOVER_THRESHOLD:
                    inc_id = int(r.get(open_key))
                    inc = s.get(Incident, inc_id)
                    if inc and inc.state == "open":
                        inc.state = "resolved"
                        inc.closed_at = datetime.now(timezone.utc)
                        s.commit()
                        enqueue_alert({"type": "recovered", "monitor_id": m.id, "incident_id": inc_id})
                    r.delete(open_key)
            else:
                r.delete(KEY_PASSES + str(m.id))
                fails = r.incr(KEY_FAILS + str(m.id))
                if fails >= FAIL_THRESHOLD:
                    open_key = f"incident_open:{m.id}"
                    if not r.get(open_key):
                        inc = Incident(
                            monitor_id=m.id,
                            reason=err or (f"HTTP {status_code}" if status_code else "network error")
                        )
                        s.add(inc)
                        s.commit()
                        s.refresh(inc)
                        r.set(open_key, str(inc.id))
                        enqueue_alert({
                            "type": "incident",
                            "monitor_id": m.id,
                            "incident_id": inc.id,
                            "reason": inc.reason
                        })
    finally:
        s.close()


if __name__ == "__main__":
    # Be resilient if DB is still coming up or tables don’t exist yet
    for _ in range(30):
        try:
            ensure_tables_once()
            print("[monitor] Tables ensured.")
            break
        except (ProgrammingError, OperationalError) as e:
            print(f"[monitor] Waiting for DB tables ({e})...")
            time.sleep(2)

    print("[monitor] Starting monitor loop...")
    while True:
        try:
            tick_once()
        except (ProgrammingError, OperationalError) as e:
            print(f"[monitor] DB error during tick: {e}")
            ensure_tables_once()
        time.sleep(1)
