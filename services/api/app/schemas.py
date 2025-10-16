from pydantic import BaseModel, HttpUrl
from typing import List, Optional


class MonitorCreate(BaseModel):
    name: str
    url: HttpUrl
    method: str = "GET"
    interval_sec: int = 60
    timeout_ms: int = 5000
    expected_statuses: List[int] = [200]
    is_enabled: bool = True


class MonitorOut(MonitorCreate):
    id: int


class SummaryOut(BaseModel):
    uptime_percent: float
    avg_latency_ms: Optional[float]
    window: str
