import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .db import Base, engine, get_db
from . import models, schemas, crud


Base.metadata.create_all(bind=engine)


app = FastAPI(title="Uptime API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"ok": True}


# Admin CRUD
@app.post("/monitors", response_model=schemas.MonitorOut)
def create_monitor(payload: schemas.MonitorCreate, db: Session = Depends(get_db)):
    return crud.create_monitor(db, payload)


@app.get("/monitors", response_model=list[schemas.MonitorOut])
def list_monitors(db: Session = Depends(get_db)):
    return crud.list_monitors(db)


# Public endpoints
@app.get("/public/monitors")
def public_monitors(db: Session = Depends(get_db)):
    return crud.list_monitors(db)


@app.get("/public/monitors/{monitor_id}/summary")
def public_summary(monitor_id: int, window: str = "24h", db: Session = Depends(get_db)):
    up, avg = crud.get_summary(db, monitor_id, window)
    return {"uptime_percent": up, "avg_latency_ms": avg, "window": window}


@app.get("/public/incidents/active")
def public_incidents(db: Session = Depends(get_db)):
    inc = crud.active_incidents(db)
    return [
        {
            "id": i.id,
            "monitor_id": i.monitor_id,
            "opened_at": i.opened_at,
            "reason": i.reason,
            "state": i.state
        } 
        for i in inc
    ]
