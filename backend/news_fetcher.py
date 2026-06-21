"""
Fetch market-moving news from free public RSS/JSON sources.
Sources: Reuters, Kitco, Forex Factory, Federal Reserve, ECB, Investing.com
"""

import httpx
import feedparser
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from typing import List, Dict, Any

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
}

CUTOFF_HOURS = 72


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _parse_dt(raw: str) -> datetime:
    if not raw:
        return datetime.now(timezone.utc)
    for parser in [parsedate_to_datetime, lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))]:
        try:
            return _to_utc(parser(raw))
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _age_str(pub: datetime) -> str:
    delta = datetime.now(timezone.utc) - _to_utc(pub)
    h = int(delta.total_seconds() / 3600)
    if h < 1:
        m = max(1, int(delta.total_seconds() / 60))
        return f"{m}m ago"
    if h < 24:
        return f"{h}h ago"
    return f"{h // 24}d ago"


def _fetch_rss(url: str, source: str, limit: int = 20) -> List[Dict[str, Any]]:
    try:
        with httpx.Client(headers=HEADERS, timeout=9, follow_redirects=True) as c:
            r = c.get(url)
            r.raise_for_status()
        feed = feedparser.parse(r.text)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CUTOFF_HOURS)
        items = []
        for e in feed.entries[:limit]:
            pub = _parse_dt(e.get("published") or e.get("updated") or "")
            if pub < cutoff:
                continue
            headline = (e.get("title") or "").strip()
            if not headline:
                continue
            items.append({
                "headline": headline,
                "summary": (e.get("summary") or "")[:350].strip(),
                "source": source,
                "url": e.get("link", ""),
                "published_at": pub.isoformat(),
                "age": _age_str(pub),
            })
        return items
    except Exception as ex:
        print(f"[news_fetcher] {source}: {ex}")
        return []


def _fetch_forex_factory() -> List[Dict[str, Any]]:
    try:
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        with httpx.Client(headers=HEADERS, timeout=9, follow_redirects=True) as c:
            r = c.get(url)
            r.raise_for_status()
        events = r.json()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=72)
        items = []
        for ev in events:
            if ev.get("impact", "").lower() not in ("high", "medium"):
                continue
            try:
                ev_dt = _to_utc(datetime.fromisoformat(ev["date"].replace("Z", "+00:00")))
            except Exception:
                ev_dt = datetime.now(timezone.utc)
            if ev_dt < cutoff:
                continue
            actual = ev.get("actual") or "TBD"
            items.append({
                "headline": f"{ev.get('currency','?')} — {ev.get('title','?')}",
                "summary": (
                    f"Impact: {ev.get('impact','?').upper()} | "
                    f"Actual: {actual} | Forecast: {ev.get('forecast','N/A')} | "
                    f"Previous: {ev.get('previous','N/A')}"
                ),
                "source": "Forex Factory",
                "url": "https://www.forexfactory.com/calendar",
                "published_at": ev_dt.isoformat(),
                "age": _age_str(ev_dt),
            })
        return items
    except Exception as ex:
        print(f"[news_fetcher] Forex Factory: {ex}")
        return []


RSS_SOURCES = [
    ("https://feeds.reuters.com/reuters/businessNews",          "Reuters Business"),
    ("https://feeds.reuters.com/reuters/topNews",               "Reuters"),
    ("https://feeds.reuters.com/reuters/financialSectorNews",   "Reuters Finance"),
    ("https://www.federalreserve.gov/feeds/press_all.xml",      "Federal Reserve"),
    ("https://www.kitco.com/rss/",                              "Kitco News"),
    ("https://www.investing.com/rss/news_25.rss",               "Investing.com Forex"),
    ("https://www.investing.com/rss/news_301.rss",              "Investing.com Commodities"),
    ("https://www.investing.com/rss/news_14.rss",               "Investing.com Crypto"),
    ("https://www.investing.com/rss/news_11.rss",               "Investing.com Economy"),
    ("https://www.ecb.europa.eu/rss/press.html",                "ECB"),
]


def fetch_all_news(asset_name: str) -> List[Dict[str, Any]]:
    """Fetch news from all sources. Called synchronously in a thread executor."""
    all_items: List[Dict[str, Any]] = []

    for url, source in RSS_SOURCES:
        all_items.extend(_fetch_rss(url, source))

    all_items.extend(_fetch_forex_factory())

    # Deduplicate on headline prefix
    seen: set = set()
    unique: List[Dict[str, Any]] = []
    for item in all_items:
        key = item["headline"][:70].lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(item)

    unique.sort(key=lambda x: x["published_at"], reverse=True)
    return unique[:60]
