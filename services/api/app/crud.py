from sqlalchemy.orm import Session
from . import models, schemas

def create_monitor(db: Session, payload: schemas.MonitorCreate) -> models.Monitor:
    m = models.Monitor(
        name=payload.name,
        url=str(payload.url),
        method=payload.method,
        interval_sec=payload.interval_sec,
        timeout_ms=payload.timeout_ms,
        expected_statuses=list(payload.expected_statuses or [200]),
        is_enabled=payload.is_enabled,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

def list_monitors(db: Session) -> list[models.Monitor]:
    return db.query(models.Monitor).order_by(models.Monitor.id.desc()).all()

def get_summary(db: Session, monitor_id: int, window: str):
    # stub summary; you can extend with real time windows later
    from sqlalchemy import func
    avg_latency = db.query(func.avg(models.Check.latency_ms)).filter(models.Check.monitor_id == monitor_id).scalar()
    total = db.query(models.Check).filter(models.Check.monitor_id == monitor_id).count()
    ok = db.query(models.Check).filter(models.Check.monitor_id == monitor_id, models.Check.ok == True).count()
    uptime = (ok / total * 100.0) if total else 0.0
    return round(uptime, 2), int(avg_latency or 0)

def active_incidents(db: Session):
    return db.query(models.Incident).filter(models.Incident.state == "open").all()
