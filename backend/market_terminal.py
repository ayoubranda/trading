"""
FIBRIOS Market Terminal — Fast multi-asset scanner.
Fetches all 13 assets in parallel, scores with one Claude call.
"""
import json
import re
import threading
import anthropic
import numpy as np
import yfinance as yf
from typing import Dict, Any, List, Optional

# ── Asset registry ──────────────────────────────────────────────
TERMINAL_ASSETS: Dict[str, Dict] = {
    "EUR/USD":  {"yf": "EURUSD=X", "category": "Forex",   "decimals": 5},
    "GBP/USD":  {"yf": "GBPUSD=X", "category": "Forex",   "decimals": 5},
    "USD/JPY":  {"yf": "USDJPY=X", "category": "Forex",   "decimals": 3},
    "USD/CHF":  {"yf": "USDCHF=X", "category": "Forex",   "decimals": 5},
    "AUD/USD":  {"yf": "AUDUSD=X", "category": "Forex",   "decimals": 5},
    "NZD/USD":  {"yf": "NZDUSD=X", "category": "Forex",   "decimals": 5},
    "USD/CAD":  {"yf": "USDCAD=X", "category": "Forex",   "decimals": 5},
    "XAU/USD":  {"yf": "GC=F",     "category": "Metals",  "decimals": 2},
    "XAG/USD":  {"yf": "SI=F",     "category": "Metals",  "decimals": 3},
    "USOIL":    {"yf": "CL=F",     "category": "Energy",  "decimals": 2},
    "UKOIL":    {"yf": "BZ=F",     "category": "Energy",  "decimals": 2},
    "NASDAQ":   {"yf": "NQ=F",     "category": "Indices", "decimals": 1},
    "S&P500":   {"yf": "ES=F",     "category": "Indices", "decimals": 1},
}

_SCAN_SYSTEM = """You are a fast institutional market scanner.
Analyze market data for multiple assets and score each for trading opportunity quality.

For EACH asset evaluate:
- opportunity_score: number 0-10 (0=no trade, 10=exceptional)
- trend: "Bullish" | "Bearish" | "Neutral"
- momentum: "Strong" | "Medium" | "Weak"
- structure: "Breakout" | "Pullback" | "Range"
- volatility: "High" | "Normal" | "Low"
- news_impact: "Positive" | "Negative" | "Neutral"
- institutional_bias: string (1 sentence, cite ICT/Wyckoff concept)
- opportunity_class: "High Probability Setup" | "Possible Trade" | "Watchlist" | "Avoid"
- direction_bias: "BUY" | "SELL" | "NEUTRAL"

Scoring guide:
8-10 = Strong trend alignment + momentum + clear structure + good R:R
6-7  = Setup forming but needs confirmation
4-5  = Watchlist only; conflicting signals
0-3  = No trade; ranging, weak, or unfavorable

For the top 3 highest-scoring assets also include trade_proposal:
{
  "direction": "BUY"|"SELL",
  "entry_zone": "price or range",
  "stop_loss": "price",
  "take_profit_1": "price",
  "take_profit_2": "price",
  "rr_ratio": "e.g. 2.1:1",
  "setup_notes": "1 sentence ICT/Wyckoff rationale"
}

Also provide scan_summary:
{
  "market_risk": "Low"|"Medium"|"High",
  "market_sentiment": "Bullish"|"Bearish"|"Mixed",
  "best_asset": "name",
  "worst_asset": "name",
  "summary_note": "1-2 sentence macro context"
}

Return ONLY valid JSON with this exact structure:
{
  "assets": [
    {
      "name": "string",
      "opportunity_score": number,
      "trend": "string",
      "momentum": "string",
      "structure": "string",
      "volatility": "string",
      "news_impact": "string",
      "institutional_bias": "string",
      "opportunity_class": "string",
      "direction_bias": "string",
      "trade_proposal": { ... } or null
    }
  ],
  "scan_summary": { ... }
}
"""


# ── Fetch one asset ─────────────────────────────────────────────
def _fetch_asset(name: str, cfg: Dict) -> Optional[Dict]:
    try:
        hist = yf.Ticker(cfg["yf"]).history(period="10d", interval="1d")
        if hist.empty or len(hist) < 3:
            return None

        closes  = hist["Close"].values.astype(float)
        highs   = hist["High"].values.astype(float)
        lows    = hist["Low"].values.astype(float)
        vols    = hist["Volume"].values.astype(float) if "Volume" in hist.columns else np.ones(len(closes))
        d       = cfg["decimals"]
        cur     = float(closes[-1])

        chg_pct   = (closes[-1] - closes[-2]) / closes[-2] * 100
        trend_pct = (closes[-1] - closes[0]) / closes[0] * 100 if len(closes) >= 5 else chg_pct

        # RSI-14 (simplified over available bars)
        diffs   = np.diff(closes)
        gains   = np.where(diffs > 0, diffs, 0)
        losses  = np.where(diffs < 0, -diffs, 0)
        avg_g   = gains.mean()  if gains.size  else 0
        avg_l   = losses.mean() if losses.size else 0
        rsi     = 100 - 100/(1 + avg_g/avg_l) if avg_l > 0 else 50.0

        # ATR
        tr = [max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
              for i in range(1, len(closes))]
        atr     = float(np.mean(tr[-5:])) if tr else 0.0
        atr_pct = atr / cur * 100

        # Volume ratio
        vol_ratio = float(vols[-1] / np.mean(vols[:-1])) if len(vols)>1 and np.mean(vols[:-1])>0 else 1.0

        candles = [
            {
                "date":  str(hist.index[i].date()),
                "open":  round(float(hist["Open"].iloc[i]), d),
                "high":  round(float(hist["High"].iloc[i]), d),
                "low":   round(float(hist["Low"].iloc[i]),  d),
                "close": round(float(hist["Close"].iloc[i]),d),
            }
            for i in range(max(0, len(hist)-5), len(hist))
        ]

        return {
            "name":       name,
            "category":   cfg["category"],
            "price":      round(cur, d),
            "change_pct": round(chg_pct, 2),
            "trend_5d":   round(trend_pct, 2),
            "rsi":        round(rsi, 1),
            "atr_pct":    round(atr_pct, 3),
            "vol_ratio":  round(vol_ratio, 2),
            "candles":    candles,
        }
    except Exception:
        return None


# ── Parallel fetch all assets ───────────────────────────────────
def fetch_all() -> List[Dict]:
    results: List[Optional[Dict]] = [None] * len(TERMINAL_ASSETS)
    names   = list(TERMINAL_ASSETS.keys())
    configs = list(TERMINAL_ASSETS.values())
    lock    = threading.Lock()

    def _worker(idx: int, name: str, cfg: Dict) -> None:
        data = _fetch_asset(name, cfg)
        with lock:
            results[idx] = data

    threads = [threading.Thread(target=_worker, args=(i, n, c), daemon=True)
               for i, (n, c) in enumerate(zip(names, configs))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=20)

    return [r for r in results if r is not None]


# ── Single Claude scoring call ──────────────────────────────────
def score_assets(assets_data: List[Dict], api_key: str, model: str) -> Dict:
    lines = []
    for a in assets_data:
        candle_str = "  ".join(
            f"{c['date']} O={c['open']} H={c['high']} L={c['low']} C={c['close']}"
            for c in a["candles"]
        )
        lines.append(
            f"[{a['name']}] ({a['category']}) | Price={a['price']} | "
            f"Change={a['change_pct']:+.2f}% | Trend5d={a['trend_5d']:+.2f}% | "
            f"RSI={a['rsi']} | ATR%={a['atr_pct']} | VolRatio={a['vol_ratio']}\n"
            f"  Last 5 candles: {candle_str}"
        )

    user_msg = (
        f"Scan these {len(assets_data)} assets and score each 0-10.\n\n"
        + "\n\n".join(lines)
        + "\n\nReturn ONLY valid JSON."
    )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=3000,
        system=_SCAN_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw = msg.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw.strip())


# ── Algorithmic fallback scorer ─────────────────────────────────
def score_assets_local(assets_data: List[Dict]) -> Dict:
    """Pure-computation scoring when no API key is provided."""
    scored = []
    for a in assets_data:
        rsi       = a["rsi"]
        trend5d   = a["trend_5d"]
        chg       = a["change_pct"]
        atr_pct   = a["atr_pct"]
        vol_ratio = a["vol_ratio"]

        trend     = "Bullish" if trend5d > 0.5 else "Bearish" if trend5d < -0.5 else "Neutral"
        momentum  = "Strong"  if rsi > 65 or rsi < 35 else "Medium" if rsi > 55 or rsi < 45 else "Weak"
        volatility= "High"    if atr_pct > 1.5 else "Normal" if atr_pct > 0.4 else "Low"
        structure = ("Breakout" if abs(chg) > atr_pct * 0.8
                     else "Pullback" if (trend5d > 0 and chg < 0) or (trend5d < 0 and chg > 0)
                     else "Range")

        # Simple score
        score = 5.0
        if abs(trend5d) > 1.0: score += 1.5
        if abs(trend5d) > 2.0: score += 1.0
        if rsi > 60 or rsi < 40: score += 1.0
        if rsi > 70 or rsi < 30: score -= 0.5  # overbought/sold penalty
        if vol_ratio > 1.3: score += 0.5
        if structure == "Breakout": score += 1.0
        if structure == "Pullback" and abs(trend5d) > 0.5: score += 0.5
        if volatility == "Low": score -= 1.0
        score = round(max(0, min(10, score)), 1)

        bias = "BUY" if trend5d > 0 else "SELL" if trend5d < 0 else "NEUTRAL"
        opp  = ("High Probability Setup" if score >= 8
                 else "Possible Trade"   if score >= 6
                 else "Watchlist"        if score >= 4
                 else "Avoid")

        scored.append({
            "name":              a["name"],
            "opportunity_score": score,
            "trend":             trend,
            "momentum":          momentum,
            "structure":         structure,
            "volatility":        volatility,
            "news_impact":       "Neutral",
            "institutional_bias": f"{trend} structure with {momentum.lower()} momentum — {structure.lower()} pattern",
            "opportunity_class": opp,
            "direction_bias":    bias,
            "trade_proposal":    None,
        })

    scored.sort(key=lambda x: x["opportunity_score"], reverse=True)

    sentiments = [s["trend"] for s in scored]
    bull = sentiments.count("Bullish")
    bear = sentiments.count("Bearish")
    sentiment = "Bullish" if bull > bear else "Bearish" if bear > bull else "Mixed"

    avg_score = sum(s["opportunity_score"] for s in scored) / len(scored) if scored else 5
    risk = "Low" if avg_score >= 7 else "Medium" if avg_score >= 5 else "High"

    return {
        "assets": scored,
        "scan_summary": {
            "market_risk":      risk,
            "market_sentiment": sentiment,
            "best_asset":       scored[0]["name"] if scored else "—",
            "worst_asset":      scored[-1]["name"] if scored else "—",
            "summary_note":     f"{bull} of {len(scored)} assets show bullish bias. Market sentiment: {sentiment}.",
        },
    }


# ── Main scan entry point ───────────────────────────────────────
def run_scan(api_key: Optional[str] = None, model: str = "claude-sonnet-4-6") -> Dict:
    assets_data = fetch_all()
    if not assets_data:
        return {"error": "Failed to fetch market data"}

    if api_key and api_key.strip():
        try:
            scored = score_assets(assets_data, api_key.strip(), model)
        except Exception:
            scored = score_assets_local(assets_data)
    else:
        scored = score_assets_local(assets_data)

    # Attach raw price data for display
    price_map = {a["name"]: {"price": a["price"], "change_pct": a["change_pct"]} for a in assets_data}
    for asset in scored.get("assets", []):
        pd = price_map.get(asset["name"], {})
        asset["price"]      = pd.get("price", "—")
        asset["change_pct"] = pd.get("change_pct", 0)

    return scored
