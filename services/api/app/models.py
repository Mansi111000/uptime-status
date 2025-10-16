from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger, ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .db import Base


class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    method = Column(String, default="GET")
    interval_sec = Column(Integer, default=60)
    timeout_ms = Column(Integer, default=5000)
    expected_statuses = Column(ARRAY(Integer), default=[200])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_enabled = Column(Boolean, default=True)

    checks = relationship("Check", back_populates="monitor", cascade="all,delete")


class Check(Base):
    __tablename__ = "checks"

    id = Column(BigInteger, primary_key=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), index=True)
    ts = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status_code = Column(Integer)
    latency_ms = Column(Integer)
    ok = Column(Boolean, index=True)
    error_reason = Column(String)

    monitor = relationship("Monitor", back_populates="checks")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), index=True)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True))
    reason = Column(String)
    state = Column(String, default="open")  # open|resolved


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True)
    channel = Column(String)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String)
    detail = Column(String)
