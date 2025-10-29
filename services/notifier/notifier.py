# import os, json, time
# import redis
# import requests
# from db import SessionLocal
# from models import Notification

# TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
# r = redis.from_url(REDIS_URL)

# def send_telegram(msg: str):
#     if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
#         print("⚠️  Telegram not configured; skipping:", msg)
#         return
#     url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
#     data = {"chat_id": TELEGRAM_CHAT_ID, "text": msg, "parse_mode": "Markdown"}
#     try:
#         res = requests.post(url, data=data, timeout=10)
#         print("✅ Telegram send:", res.status_code, res.text[:120])
#     except Exception as e:
#         print("❌ Telegram error:", repr(e))

# def process_alert(alert: dict):
#     s = SessionLocal()
#     try:
#         t = alert.get("type")
#         if t == "incident":
#             msg = f"🚨 *Incident* monitor #{alert.get('monitor_id')}\nReason: {alert.get('reason','unknown')}"
#         elif t == "recovered":
#             msg = f"✅ *Recovered* monitor #{alert.get('monitor_id')}"
#         else:
#             msg = f"ℹ️  Alert: {json.dumps(alert)[:200]}"
#         send_telegram(msg)
#         # record to notifications table (optional)
#         n = Notification(
#             incident_id=alert.get("incident_id") or 0,
#             channel="telegram",
#             status="sent",
#             detail=msg
#         )
#         s.add(n); s.commit()
#     finally:
#         s.close()

# if __name__ == "__main__":
#     print("🔔 Notifier starting...")
#     if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
#         print("✅ Telegram configured; chat:", TELEGRAM_CHAT_ID)
#     else:
#         print("⚠️  Telegram env missing; set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")

#     print("🧰 Redis:", REDIS_URL)
#     print("👂 Waiting for alerts on list 'alerts'...")
#     while True:
#         try:
#             item = r.brpop("alerts", timeout=0)  # block until message
#             _, payload = item
#             alert = json.loads(payload)
#             print("📨 Got alert:", alert)
#             process_alert(alert)
#         except Exception as e:
#             print("⚠️  Loop error:", repr(e))
#             time.sleep(1)

# services/notifier/notifier.py
import os, json, time
import redis
import requests
from sqlalchemy.exc import OperationalError
from db import SessionLocal
from models import Notification
from sqlalchemy.orm import Session
from models import Notification, Incident


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0").strip()


def process_alert(alert: dict):
    s: Session = SessionLocal()
    try:
        t = alert.get("type")
        if t == "incident":
            msg = f"🚨 *Incident* monitor #{alert.get('monitor_id')}\nReason: {alert.get('reason','unknown')}"
        elif t == "recovered":
            msg = f"✅ *Recovered* monitor #{alert.get('monitor_id')}"
        else:
            msg = f"ℹ️  Alert: {json.dumps(alert)[:200]}"

        send_telegram(msg)

        # only keep incident_id if it actually exists
        inc_id = alert.get("incident_id")
        if isinstance(inc_id, int) and s.get(Incident, inc_id) is not None:
            incident_id_db = inc_id
        else:
            incident_id_db = None

        n = Notification(
            incident_id=incident_id_db,
            channel="telegram",
            status="sent",
            detail=msg
        )
        s.add(n); s.commit()
    finally:
        s.close()



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

def wait_for_db(max_tries=30, sleep=1.5):
    tries = 0
    while True:
        tries += 1
        try:
            s = SessionLocal()
            # low-level driver exec (bypasses SQLA text wrapping)
            s.connection().exec_driver_sql("SELECT 1")
            s.close()
            print(f"[notifier] DB ready after {tries} attempt(s).")
            return
        except OperationalError:
            if tries >= max_tries:
                raise
            time.sleep(sleep)

def wait_for_redis(max_tries=30, sleep=1.5):
    tries = 0
    client = None
    while True:
        tries += 1
        try:
            client = redis.from_url(REDIS_URL)
            client.ping()
            print(f"[notifier] Redis ready after {tries} attempt(s).")
            return client
        except Exception:
            if tries >= max_tries:
                raise
            time.sleep(sleep)

def record_notification(incident_id: int, channel: str, status: str, detail: str):
    s = SessionLocal()
    try:
        n = Notification(
            incident_id=incident_id,
            channel=channel,
            status=status,
            detail=detail
        )
        s.add(n)
        s.commit()
    finally:
        s.close()

def process_alert(alert: dict):
    t = alert.get("type")
    if t == "incident":
        msg = f"🚨 *Incident* monitor #{alert.get('monitor_id')}\nReason: {alert.get('reason','unknown')}"
    elif t == "recovered":
        msg = f"✅ *Recovered* monitor #{alert.get('monitor_id')}"
    else:
        msg = f"ℹ️  Alert: {json.dumps(alert)[:200]}"

    send_telegram(msg)
    record_notification(
        incident_id=int(alert.get("incident_id") or 0),
        channel="telegram" if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID else "noop",
        status="sent",
        detail=msg
    )

def main():
    print("🔔 Notifier starting...")
    print("🧰 Redis URL:", REDIS_URL)
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        print("✅ Telegram configured; chat:", TELEGRAM_CHAT_ID)
    else:
        print("⚠️  Telegram env missing or has spaces; set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")

    wait_for_db()
    r = wait_for_redis()

    # Optional one-time boot message (useful to validate token/chat quickly)
    try:
        send_telegram("🔔 Uptime notifier booted successfully.")
    except Exception as e:
        print("❌ Telegram boot message failed:", e)

    print("👂 Waiting for alerts on list 'alerts'...")
    while True:
        try:
            item = r.brpop("alerts", timeout=0)  # blocks until an alert arrives
            if not item:
                continue
            _, payload = item
            alert = json.loads(payload)
            print("📨 Got alert:", alert)
            process_alert(alert)
        except KeyboardInterrupt:
            print("👋 Notifier stopping...")
            break
        except Exception as e:
            print("⚠️  Loop error:", repr(e))
            time.sleep(1)

if __name__ == "__main__":
    main()
