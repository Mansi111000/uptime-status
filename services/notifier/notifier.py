import os, json, time
import redis
import requests
from db import SessionLocal
from models import Notification

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
r = redis.from_url(REDIS_URL)

def send_telegram(msg: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️  Telegram not configured; skipping:", msg)
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"}
    try:
        res = requests.post(url, data=data, timeout=10)
        print("✅ Telegram send:", res.status_code, res.text[:120])
    except Exception as e:
        print("❌ Telegram error:", repr(e))

def process_alert(alert: dict):
    s = SessionLocal()
    try:
        t = alert.get("type")
        if t == "incident":
            msg = f"🚨 *Incident* monitor #{alert.get('monitor_id')}\nReason: {alert.get('reason','unknown')}"
        elif t == "recovered":
            msg = f"✅ *Recovered* monitor #{alert.get('monitor_id')}"
        else:
            msg = f"ℹ️  Alert: {json.dumps(alert)[:200]}"
        send_telegram(msg)
        # record to notifications table (optional)
        n = Notification(
            incident_id=alert.get("incident_id") or 0,
            channel="telegram",
            status="sent",
            detail=msg
        )
        s.add(n); s.commit()
    finally:
        s.close()

if __name__ == "__main__":
    print("🔔 Notifier starting...")
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print("✅ Telegram configured; chat:", TELEGRAM_CHAT_ID)
    else:
        print("⚠️  Telegram env missing; set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")

    print("🧰 Redis:", REDIS_URL)
    print("👂 Waiting for alerts on list 'alerts'...")
    while True:
        try:
            item = r.brpop("alerts", timeout=0)  # block until message
            _, payload = item
            alert = json.loads(payload)
            print("📨 Got alert:", alert)
            process_alert(alert)
        except Exception as e:
            print("⚠️  Loop error:", repr(e))
            time.sleep(1)
