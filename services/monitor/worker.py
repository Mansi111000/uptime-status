import os, time, json
from datetime import datetime, timezone
import httpx
from sqlalchemy.orm import Session
from services.api.app.models import Monitor, Check, Incident  # type: ignore

RECOVER_THRESHOLD = int(os.getenv("RECOVER_THRESHOLD", 2))
FAIL_THRESHOLD = int(os.getenv("FAIL_THRESHOLD", 3))  # Assuming this is needed
DEFAULT_INTERVAL = int(os.getenv("DEFAULT_INTERVAL_SEC", 60))
TIMEOUT_MS = int(os.getenv("CHECK_TIMEOUT_MS", 5000))

KEY_FAILS = "fails:"  # key per monitor id: integer fail count
KEY_PASSES = "passes:"


def enqueue_alert(event: dict):
    r.lpush("alerts", json.dumps(event))


def tick_once():
    from sqlalchemy import select

    s = Session()
    try:
        mons = s.scalars(select(Monitor).where(Monitor.is_enabled == True)).all()
        for m in mons:
            # interval simple pacing via Redis timestamp per monitor
            last_ts_key = f"last:{m.id}"
            last = r.get(last_ts_key)
            now = int(time.time())
            if last and now - int(last) < (m.interval_sec or DEFAULT_INTERVAL):
                continue
            r.set(last_ts_key, str(now))

            try:
                start = time.perf_counter()
                resp = httpx.request(m.method, m.url, timeout=TIMEOUT_MS / 1000)
                latency = int((time.perf_counter() - start) * 1000)
                ok = resp.status_code in (m.expected_statuses or [200])
                status_code = resp.status_code
                err = None
            except Exception as e:
                latency = None
                ok = False
                status_code = None
                err = str(e)[:500]

            # write check row
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

            # incident logic using Redis counters
            if ok:
                r.delete(KEY_FAILS + str(m.id))
                passes = r.incr(KEY_PASSES + str(m.id))
                # resolve if open and enough passes
                open_key = f"incident_open:{m.id}"
                if r.get(open_key) and passes >= RECOVER_THRESHOLD:
                    # resolve
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
                    # open incident if not already
                    open_key = f"incident_open:{m.id}"
                    if not r.get(open_key):
                        inc = Incident(monitor_id=m.id, reason=err or f"HTTP {status_code}")
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
    while True:
        tick_once()
        time.sleep(1)
