import os
import json
import time
import requests
import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from services.api.app.models import Notification  # type: ignore


DB = os.getenv("DATABASE_URL")
engine = create_engine(DB, pool_pre_ping=True)
Session = sessionmaker(bind=engine)

r = redis.from_url(os.getenv("REDIS_URL"))

TG_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TG_CHAT = os.getenv("TELEGRAM_CHAT_ID")
SMTP_HOST = os.getenv("SMTP_HOST")  # Placeholder if needed later


def send_telegram(text: str):
    if not TG_TOKEN or not TG_CHAT:
        return False, "telegram not configured"
    url = f"https://api.telegram.org/bot{TG_TOKEN}/sendMessage"
    resp = requests.post(url, json={"chat_id": TG_CHAT, "text": text, "parse_mode": "HTML"})
    return resp.ok, resp.text[:300]


def loop():
    while True:
        msg = r.brpop("alerts", timeout=5)
        if not msg:
            continue
        _, payload = msg
        event = json.loads(payload)
        s = Session()
        try:
            if event.get("type") == "incident":
                ok, detail = send_telegram(
                    f"\u26a0\ufe0f Incident opened for monitor {event['monitor_id']}: {event.get('reason','')} (# {event['incident_id']})"
                )
                n = Notification(
                    incident_id=event["incident_id"],
                    channel="telegram",
                    status="ok" if ok else "fail",
                    detail=detail
                )
                s.add(n)
                s.commit()
            elif event.get("type") == "recovered":
                ok, detail = send_telegram(
                    f"\u2705 Recovered: monitor {event['monitor_id']} (incident #{event['incident_id']})"
                )
                n = Notification(
                    incident_id=event["incident_id"],
                    channel="telegram",
                    status="ok" if ok else "fail",
                    detail=detail
                )
                s.add(n)
                s.commit()
        finally:
            s.close()


if __name__ == "__main__":
    loop()
