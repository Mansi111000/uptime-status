from sqlalchemy.orm import Session
from sqlalchemy import select, func
from . import models
from datetime import datetime, timedelta, timezone


def create_monitor(db: Session, payload):
    m = models.Monitor(**payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def list_monitors(db: Session):
    return db.scalars(select(models.Monitor)).all()


def get_summary(db: Session, monitor_id: int, window: str):
    # window: 24h or 7d
    now = datetime.now(timezone.utc)
    delta = timedelta(hours=24) if window == "24h" else timedelta(days=7)
    start = now - delta
    q = select(models.Check).where(models.Check.monitor_id == monitor_id, models.Check.ts >= start)
    rows = db.scalars(q).all()

    if not rows:
        return 0.0, None

    ok_count = sum(1 for r in rows if r.ok)
    uptime = (ok_count / len(rows)) * 100.0
    latencies = [r.latency_ms for r in rows if r.latency_ms is not None]
    avg = sum(latencies) / len(latencies) if latencies else None

    return round(uptime, 2), (round(avg, 2) if avg else None)


def active_incidents(db: Session):
    q = select(models.Incident).where(models.Incident.state == "open")
    return db.scalars(q).all()
