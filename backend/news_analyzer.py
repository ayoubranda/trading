"""
Analyze market-moving news for a specific trading asset using Claude.
Returns structured JSON: impact scores, sentiment, asset-specific bias, institutional outlook.
"""

import anthropic
import json
import re
from typing import Dict, Any, List

_SYSTEM = """You are a senior fundamental analyst at an institutional macro hedge fund.
Your task: analyze financial news and produce an institutional-grade fundamental analysis for one specific trading asset.

═══════════════════════════════════════════════════════════
ASSET-SPECIFIC INTERPRETATION RULES (MANDATORY)
═══════════════════════════════════════════════════════════

GOLD / XAUUSD / XAU:
  Bullish drivers: Fed rate cuts, dovish Fed, USD weakness, geopolitical tensions/war,
                   inflation fears, recession fears, central bank gold buying, risk-off
  Bearish drivers: Fed rate hikes, hawkish Fed, rising real yields, USD strength,
                   falling inflation, risk-on sentiment, strong economic data

USD / DOLLAR (DXY, USDJPY, USDCAD etc.):
  Bullish: Strong NFP, high CPI, hawkish Fed, strong retail sales, risk-off flight to safety
  Bearish: Fed cuts, weak employment, low inflation, fiscal deficits, risk-on

EURUSD:
  Bullish EUR: Hawkish ECB, strong EU data, dovish Fed
  Bearish EUR: Dovish ECB, weak EU data, hawkish Fed, USD strength

GBPUSD:
  Bullish GBP: Hawkish BoE, strong UK data, risk-on
  Bearish GBP: Dovish BoE, Brexit risks, weak UK data

Equities / Indices (NASDAQ, S&P500, US30, NAS100):
  Bullish: Rate cuts, strong earnings, risk-on, economic growth, low inflation
  Bearish: Rate hikes, recession fears, earnings misses, geopolitical shock, high inflation

Crypto (BTCUSD, ETHUSD):
  Bullish: Risk-on, USD weakness, institutional adoption, regulatory clarity, low rates
  Bearish: Risk-off, USD strength, regulatory crackdown, liquidity tightening

Oil (USOIL, WTI, XTIUSD):
  Bullish: Supply cuts (OPEC), geopolitical risk in oil regions, weak USD, demand growth
  Bearish: Supply glut, recession, strong USD, weak demand data

═══════════════════════════════════════════════════════════
IMPACT SCORE SCALE
═══════════════════════════════════════════════════════════
9-10: FOMC rate decisions, NFP, CPI, GDP surprise, central bank emergency actions
7-8:  PPI, retail sales, Powell speeches, ECB/BoE statements, major geopolitical events
4-6:  Mid-tier economic data, Fed member speeches, trade data
1-3:  Minor company news, low-impact economic releases, general commentary

═══════════════════════════════════════════════════════════
RULES
═══════════════════════════════════════════════════════════
1. Only include news RELEVANT to the specified asset (skip unrelated articles).
2. Classify sentiment RELATIVE to the specified asset — not general market sentiment.
3. If confidence_score < 60 OR conflicting_signals → suggested_action = "NO POSITION".
4. If fewer than 3 relevant news items found → confidence_score ≤ 40, suggested_action = "NO POSITION".
5. Top 3 drivers must be the highest-impact items.
6. Institutional outlook must be 3-5 professional sentences in the style of a Bloomberg Intelligence brief.

OUTPUT: Respond with ONLY valid JSON — no markdown, no text outside JSON.

REQUIRED JSON SCHEMA:
{
  "news_items": [
    {
      "headline": "string",
      "source": "string",
      "age": "string",
      "impact_score": number (1-10),
      "sentiment": "Positive | Negative | Neutral",
      "asset_impact": "Bullish | Bearish | Neutral",
      "what_happened": "string (1-2 sentences)",
      "why_it_matters": "string (1-2 sentences)",
      "expected_reaction": "string (1 sentence, asset-specific)"
    }
  ],
  "top_drivers": ["string", "string", "string"],
  "fundamental_bias": "Strong Bullish | Bullish | Neutral | Bearish | Strong Bearish",
  "suggested_action": "LONG | SHORT | NO POSITION",
  "confidence_score": number (0-100),
  "confidence_reason": "string",
  "institutional_outlook": "string (3-5 sentences)",
  "risk_notes": "string",
  "bias_breakdown": {
    "bullish_factors": ["string"],
    "bearish_factors": ["string"],
    "conflicting_signals": boolean
  }
}
"""


def analyze_news(
    asset_name: str,
    news_items: List[Dict[str, Any]],
    api_key: str,
    model: str = "claude-opus-4-8",
    technical_bias: str | None = None,
) -> Dict[str, Any]:

    if not news_items:
        return {
            "news_items": [],
            "top_drivers": ["No recent news data available from sources"],
            "fundamental_bias": "Neutral",
            "suggested_action": "NO POSITION",
            "confidence_score": 0,
            "confidence_reason": "No news sources returned data within 72 hours.",
            "institutional_outlook": "Insufficient data to generate fundamental analysis. Verify network connectivity and retry.",
            "risk_notes": "News sources returned no data — analysis may be incomplete.",
            "bias_breakdown": {"bullish_factors": [], "bearish_factors": [], "conflicting_signals": False},
        }

    news_block = "\n\n".join(
        f"[{i+1}] SOURCE: {n['source']}  |  {n['age']}\n"
        f"HEADLINE: {n['headline']}\n"
        f"CONTEXT: {n.get('summary', '')}"
        for i, n in enumerate(news_items[:45])
    )

    tech_line = (
        f"\nCurrent technical chart analysis bias for {asset_name}: {technical_bias}\n"
        if technical_bias
        else ""
    )

    user_msg = (
        f"Asset: {asset_name}\n"
        f"{tech_line}\n"
        f"Analyze the following {len(news_items)} news items from the last 72 hours.\n"
        f"Filter for relevance to {asset_name}, score each item, and produce an institutional analysis.\n\n"
        f"NEWS FEED:\n{news_block}\n\n"
        f"Return ONLY valid JSON."
    )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=4096,
        system=_SYSTEM,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = msg.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw.strip())
