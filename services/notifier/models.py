# services/notifier/models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from db import Base

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), index=True, nullable=True)
    channel = Column(String)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String)
    detail = Column(String)
