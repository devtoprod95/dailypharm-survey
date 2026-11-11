"""
접근/활동 로그 텔레그램 요약 발송 배치 (GitHub Actions 5분 주기, 실행: python main.py).

흐름
  1. Firestore access_logs 에서 notified == false 인 로그 조회
  2. tracker_ip_settings 에서 telegram == false 인 IP 는 요약에서 제외
  3. IP별로 정리해 텔레그램으로 발송 (길면 여러 통)
  4. 처리한 로그를 notified = true 로 갱신

외부 라이브러리 없이 표준 라이브러리(urllib)만 사용한다.
Firestore 는 REST API + Web API Key 로 접근한다. (보안 규칙이 허용된 상태 기준)

환경변수(워크플로에서 주입): FIREBASE_PROJECT_ID, FIREBASE_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
"""
import html
import json
import os
import urllib.request
from collections import OrderedDict
from datetime import datetime, timedelta, timezone

PROJECT_ID = os.environ["FIREBASE_PROJECT_ID"]
API_KEY = os.environ["FIREBASE_API_KEY"]
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"
KST = timezone(timedelta(hours=9))
MAX_PER_RUN = 400
MAX_MESSAGE_LEN = 3800  # 텔레그램 4096자 제한 여유


def _request(url, body=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        url, data=data, method=method or ("POST" if body is not None else "GET"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode() or "null")


def _val(fields, key, default=""):
    v = fields.get(key)
    if not v:
        return default
    return v.get("stringValue", v.get("timestampValue", v.get("booleanValue", default)))


def fetch_pending():
    """notified == false 인 로그 (단일 필드 조건이라 별도 인덱스 불필요)"""
    body = {
        "structuredQuery": {
            "from": [{"collectionId": "access_logs"}],
            "where": {"fieldFilter": {
                "field": {"fieldPath": "notified"}, "op": "EQUAL",
                "value": {"booleanValue": False},
            }},
            "limit": MAX_PER_RUN,
        }
    }
    res = _request(f"{BASE}:runQuery?key={API_KEY}", body)
    return [r["document"] for r in res if "document" in r]


def fetch_muted_ips():
    muted, token = set(), None
    while True:
        url = f"{BASE}/tracker_ip_settings?pageSize=300&key={API_KEY}"
        if token:
            url += f"&pageToken={token}"
        res = _request(url)
        for d in res.get("documents", []):
            # 모니터링 제외(track=false) IP 는 요약에서 뺀다
            if d.get("fields", {}).get("track", {}).get("booleanValue") is False:
                muted.add(d["name"].rsplit("/", 1)[-1])
        token = res.get("nextPageToken")
        if not token:
            return muted


def mark_notified(docs):
    writes = [{
        "update": {"name": d["name"], "fields": {"notified": {"booleanValue": True}}},
        "updateMask": {"fieldPaths": ["notified"]},
    } for d in docs]
    for i in range(0, len(writes), 200):
        _request(f"{BASE}:commit?key={API_KEY}", {"writes": writes[i:i + 200]})


def send_telegram(text):
    _request(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        {"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
    )


def _kst(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(KST)


def _label(r):
    """한 줄 표시 내용. '[페이지] 한글 페이지명' / '[활동] 활동명 (상세)'"""
    if r["type"] == "action":
        return f"[활동] {r['action']}" + (f" ({r['detail']})" if r["detail"] else "")
    return f"[페이지] {r['title']}"


def build_messages(rows):
    """IP별로 묶고, 각 IP 안에서는 시간순(HH:MM)으로 한 줄씩 보여준다.
    같은 항목이 연속되면 한 줄로 합쳐 ×N 으로 표시한다."""
    rows.sort(key=lambda r: r["at"])
    by_ip = OrderedDict()
    for r in rows:
        by_ip.setdefault(r["ip"], []).append(r)

    header = (
        f"📊 <b>방문 요약</b> ({rows[0]['at']:%H:%M}~{rows[-1]['at']:%H:%M} · "
        f"{len(rows)}건 / {len(by_ip)}개 IP)"
    )
    cont_header = "📊 <b>방문 요약 (계속)</b>"

    # (IP 제목줄, [내용 줄...]) 형태로 만든 뒤 길이에 맞춰 메시지로 분할
    sections = []
    for ip, items in by_ip.items():
        merged = []  # [시각, 라벨, 횟수]
        for r in items:
            label = _label(r)
            if merged and merged[-1][1] == label:
                merged[-1][2] += 1
            else:
                merged.append([r["at"], label, 1])
        lines = [
            f"{t:%H:%M} {html.escape(l)}" + (f" ×{n}" if n > 1 else "")
            for t, l, n in merged
        ]
        sections.append((f"📍 <b>{html.escape(ip)}</b> ({len(items)}건)", lines))

    messages, cur = [], header
    for title, lines in sections:
        block_title = title
        if len(cur) + len(block_title) + 2 > MAX_MESSAGE_LEN:
            messages.append(cur)
            cur = cont_header
        cur += f"\n\n{block_title}"
        for line in lines:
            if len(cur) + len(line) + 1 > MAX_MESSAGE_LEN:
                messages.append(cur)
                cur = f"{cont_header}\n\n{title} (계속)"
            cur += f"\n{line}"
    messages.append(cur)
    return messages


def lambda_handler(event, context):
    docs = fetch_pending()
    if not docs:
        return {"sent": 0, "processed": 0}

    muted = fetch_muted_ips()
    rows = []
    for d in docs:
        f = d.get("fields", {})
        ip = _val(f, "ip", "unknown") or "unknown"
        if ip in muted:
            continue
        rows.append({
            "ip": ip,
            "type": _val(f, "type", "page"),
            "title": _val(f, "title") or _val(f, "path"),
            "action": _val(f, "action"),
            "detail": _val(f, "detail"),
            "at": _kst(_val(f, "created_at", d.get("createTime"))),
        })

    sent = 0
    if rows:
        for m in build_messages(rows):
            send_telegram(m)
            sent += 1

    # 발송 성공 후에만 처리 완료 표시 (실패 시 다음 주기에 재시도)
    mark_notified(docs)
    return {"sent": sent, "processed": len(docs), "muted_skipped": len(docs) - len(rows)}
