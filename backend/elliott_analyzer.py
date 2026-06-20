"""
Elliott Wave analyzer grounded exclusively in the Elliott Wave Principle
by A.J. Frost & Robert R. Prechter (Chapters 1–4).
"""

import anthropic
import json
import re
from pathlib import Path
from typing import Dict, Any

# ── Knowledge base (loaded once) ─────────────────────────────
_KB_CACHE: str | None = None


def _load_knowledge() -> str:
    global _KB_CACHE
    if _KB_CACHE is not None:
        return _KB_CACHE

    path = Path(__file__).parent / "knowledge" / "elliott_wave_principle.md"
    raw = path.read_text(encoding="utf-8")

    # Extract Chapters 1–4 (core rules & Fibonacci ratios; skip historical chapters 5-8)
    ch1 = raw.find("# C[HAPTER]{.small} 1")
    ch5 = raw.find("# C[HAPTER]{.small} 5")
    section = raw[ch1:ch5] if ch1 != -1 and ch5 != -1 else raw[ch1 if ch1 != -1 else 0:]

    # Clean markdown artifacts that don't add analytical value
    section = re.sub(r"\{#[^}]+\}", "", section)
    section = re.sub(r"\[\]\{#filepos\d+\}", "", section)
    section = re.sub(r"!\[img\]\([^)]+\)", "[FIGURE OMITTED]", section)
    section = re.sub(r"\{[^}]{0,80}\}", "", section)
    section = re.sub(r"\n{3,}", "\n\n", section)
    section = re.sub(r"\[\.small\]|\[\.large\]", "", section)

    _KB_CACHE = section.strip()
    return _KB_CACHE


# ── System prompt ─────────────────────────────────────────────
_SYSTEM = """You are a strict Elliott Wave analyst trained exclusively on the
Elliott Wave Principle by A.J. Frost and Robert R. Prechter.

══════════════════════════════════════════════════════════════
KNOWLEDGE BASE (Chapters 1–4 — your sole authoritative source)
══════════════════════════════════════════════════════════════
{knowledge}
══════════════════════════════════════════════════════════════

MANDATORY RULES
1. Use ONLY wave patterns, rules, and guidelines from the knowledge base above.
2. Never force a wave count. When uncertain → WAIT.
3. Calculate Elliott Confidence Score 0–100 based on:
   - Rule compliance (impulse/corrective rules)     — 30%
   - Fibonacci alignment                             — 25%
   - Degree consistency                              — 20%
   - Wave clarity / right look                      — 15%
   - Alternation principle                           — 10%
4. Every conclusion must cite the specific EWP section or rule.
5. If confidence < 50 → elliott_verdict = "NO_TRADE".
6. If wave count is ambiguous → include alternative counts.
7. Capital preservation > trade frequency.

OUTPUT: Respond with ONLY valid JSON — no markdown, no text outside JSON.

REQUIRED JSON SCHEMA:
{{
  "wave_count": {{
    "primary_label": "string (e.g. Wave 3 of Impulse)",
    "degree": "string (Grand Supercycle / Supercycle / Cycle / Primary / Intermediate / Minor / Minute / Minuette / Subminuette)",
    "pattern": "string (Impulse / Ending Diagonal / Zigzag / Flat / Triangle / Double Three / Triple Three)",
    "current_position": "string (concise description of where price is NOW within the count)",
    "sub_waves": {{
      "description": "string (e.g. W1: $xxx → W2: $xxx retrace → W3: in progress)",
      "completed": ["string"],
      "in_progress": "string",
      "projected": ["string"]
    }}
  }},
  "confidence": {{
    "score": number,
    "rating": "High (≥75) | Moderate (50-74) | Low (<50)",
    "breakdown": {{
      "rule_compliance": number,
      "fibonacci_alignment": number,
      "degree_consistency": number,
      "wave_clarity": number,
      "alternation": number
    }}
  }},
  "rules_applied": [
    {{
      "rule": "string",
      "status": "CONFIRMED | VIOLATED | INCONCLUSIVE",
      "detail": "string",
      "ewp_section": "string (e.g. Chapter 1 — Impulse)"
    }}
  ],
  "fibonacci_levels": {{
    "retracements": ["string (e.g. $2310 — 0.618 of Wave 1)"],
    "extensions": ["string (e.g. $2580 — 1.618 × Wave 1, Wave 3 target)"],
    "key_support": "string",
    "key_resistance": "string"
  }},
  "trade_recommendation": {{
    "action": "BUY | SELL | WAIT | NO_TRADE",
    "direction": "Long | Short | None",
    "wave_entry_context": "string (which wave position justifies the trade)",
    "entry_zone": "string",
    "invalidation_level": "string (wave count invalid if price crosses here)",
    "target_1": "string",
    "target_2": "string",
    "ewp_justification": "string (which EWP rule supports this trade)"
  }},
  "alternative_counts": [
    {{
      "label": "string",
      "probability_pct": number,
      "invalidation": "string",
      "implication": "string"
    }}
  ],
  "elliott_verdict": "VALID_TRADE | WAIT | NO_TRADE",
  "verdict_reason": "string",
  "wave_personality_notes": "string (from EWP Chapter 2 wave personality section)"
}}
"""


# ── Market data formatter ─────────────────────────────────────
def _format_data(d: Dict[str, Any]) -> str:
    ind = d["indicators"]
    sw = d["swing_levels"]
    candles = "\n".join(
        f"  {c['date']}: O={c['open']} H={c['high']} L={c['low']} C={c['close']} Vol={c['volume']:,}"
        for c in d["recent_candles"][-30:]
    )
    return f"""Perform a rigorous Elliott Wave count for:

ASSET:         {d['ticker']}
TIMEFRAME:     {d['timeframe']}
CURRENT PRICE: ${d['current_price']}
PERIOD HIGH:   ${d['period_high']}
PERIOD LOW:    ${d['period_low']}
24H CHANGE:    {d['price_change_1d_pct']:+.2f}%

TECHNICAL CONTEXT:
  RSI(14):      {ind.get('rsi', 'N/A')}
  SMA(20):      ${ind.get('sma20', 'N/A')}
  SMA(50):      ${ind.get('sma50', 'N/A')}
  SMA(200):     ${ind.get('sma200', 'N/A')}
  ATR(14):      ${ind.get('atr', 'N/A')}
  Volume Ratio: {ind.get('volume_ratio', 'N/A')}x

SWING REFERENCE LEVELS:
  Recent Highs: {sw.get('swing_highs', [])}
  Recent Lows:  {sw.get('swing_lows', [])}

PRICE ACTION — last 30 candles (oldest → newest):
{candles}

Apply Elliott Wave Principle strictly from the knowledge base.
Return ONLY valid JSON."""


# ── Main entry point ──────────────────────────────────────────
def analyze_elliott(market_data: Dict[str, Any], api_key: str, model: str = "claude-opus-4-8") -> Dict[str, Any]:
    knowledge = _load_knowledge()
    system = _SYSTEM.format(knowledge=knowledge)
    user_msg = _format_data(market_data)

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user_msg}],
    )

    raw = msg.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw.strip())
