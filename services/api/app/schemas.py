from typing import Literal, List
from pydantic import BaseModel, HttpUrl, Field

class MonitorBase(BaseModel):
    name: str = Field(min_length=1)
    url: HttpUrl
    method: Literal["GET", "HEAD", "POST"] = "GET"
    interval_sec: int = Field(60, ge=15, le=3600)
    timeout_ms: int = Field(5000, ge=500, le=30000)
    expected_statuses: List[int] = [200]
    is_enabled: bool = True

class MonitorCreate(MonitorBase):
    pass

class MonitorOut(MonitorBase):
    id: int
    class Config:
        from_attributes = True
