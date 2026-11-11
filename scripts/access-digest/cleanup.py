"""
오래된 접근/활동 로그 삭제 배치 (GitHub Actions 하루 1회).
created_at 이 N일(기본 7일)보다 오래된 access_logs 문서를 모두 삭제한다.
tracker_ip_settings(알림 설정)는 건드리지 않는다.

환경변수: FIREBASE_PROJECT_ID, FIREBASE_API_KEY, (선택) RETENTION_DAYS
"""
import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone

PROJECT_ID = os.environ["FIREBASE_PROJECT_ID"]
API_KEY = os.environ["FIREBASE_API_KEY"]
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "7"))

BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
PAGE = 300  # batchWrite 한도(500) 이내


def _post(url, body):
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read().decode() or "null")


def fetch_old(cutoff_iso):
    body = {"structuredQuery": {
        "from": [{"collectionId": "access_logs"}],
        "where": {"fieldFilter": {
            "field": {"fieldPath": "created_at"}, "op": "LESS_THAN",
            "value": {"timestampValue": cutoff_iso},
        }},
        "limit": PAGE,
    }}
    res = _post(f"{BASE}:runQuery?key={API_KEY}", body)
    return [r["document"]["name"] for r in res if "document" in r]


def main():
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    cutoff_iso = cutoff.strftime("%Y-%m-%dT%H:%M:%SZ")
    total = 0
    while True:
        names = fetch_old(cutoff_iso)
        if not names:
            break
        _post(f"{BASE}:batchWrite?key={API_KEY}", {"writes": [{"delete": n} for n in names]})
        total += len(names)
    print(json.dumps({"cutoff": cutoff_iso, "deleted": total}))


if __name__ == "__main__":
    main()
