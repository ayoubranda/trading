"""
Institutional Confluence Engine
Merges Technical, Elliott Wave, and News analyses into a single weighted decision.
No Claude API calls — pure computation.
"""
from typing import Dict, Any, Optional

# Configurable weights (must sum to 1.0)
WEIGHTS: Dict[str, float] = {
    "technical": 0.40,
    "elliott":   0.35,
    "news":      0.25,
}

GRADE_MAP = [
    (90, "Elite Setup"),
    (80, "A+"),
    (70, "A"),
    (60, "B"),
    (50, "C"),
    (0,  "Avoid"),
]

CONFIDENCE_MAP = [
    (90, "Very High"),
    (80, "High"),
    (70, "Medium"),
    (60, "Low"),
    (0,  "Very Low"),
]

# Wyckoff phases that boost confidence (high-probability reversal/entry phases)
_WYCKOFF_BOOST = {
    "ACCUMULATION_C": +8.0,   # Spring — highest-confidence long entry
    "ACCUMULATION_D": +5.0,   # LPS — optimal long entry
    "DISTRIBUTION_C": +8.0,   # UTAD — highest-confidence short entry
    "DISTRIBUTION_D": +5.0,   # LPSY — optimal short entry
}
# Wyckoff phases that reduce confidence (indeterminate or building phases)
_WYCKOFF_REDUCE = {
    "ACCUMULATION_A": -3.0,   # Climax — too early; direction uncertain
    "ACCUMULATION_B": -5.0,   # Cause building — not yet actionable
    "DISTRIBUTION_A": -3.0,
    "DISTRIBUTION_B": -5.0,
    "INDETERMINATE":  -5.0,
}


def _first_match(val: float, scale: list) -> str:
    for threshold, label in scale:
        if val >= threshold:
            return label
    return scale[-1][1]


def _extract_technical(a: Dict) -> tuple:
    score = float((a.get("scores") or {}).get("overall", 0))
    direction = (a.get("trade_plan") or {}).get("direction", "")
    valid = (a.get("trade_plan") or {}).get("valid_setup", False)
    bias = "bullish" if direction == "Long" else "bearish" if direction == "Short" else "neutral"

    reasons = []
    if valid:
        reasons.append(f"{direction} trade setup confirmed with valid entry conditions")
    patterns = (a.get("market_structure") or {}).get("key_patterns", [])
    reasons.extend(str(p) for p in patterns[:2])
    ms = (a.get("market_structure") or {}).get("analysis", "")
    if ms:
        reasons.append(ms[:110])

    return bias, score, [r for r in reasons if r][:5]


def _extract_elliott(e: Dict) -> tuple:
    score = float((e.get("confidence") or {}).get("score", 0))
    verdict = e.get("elliott_verdict", "NO_TRADE")
    direction = (e.get("trade_recommendation") or {}).get("direction", "")

    bias = "bullish" if direction == "Long" else "bearish" if direction == "Short" else "neutral"
    if verdict == "NO_TRADE":
        bias = "neutral"
        score = min(score, 30.0)
    elif verdict == "WAIT":
        score = min(score, 55.0)

    reasons = []
    wc = e.get("wave_count") or {}
    if wc.get("primary_label"):
        reasons.append(wc["primary_label"])
    if wc.get("current_position"):
        reasons.append(wc["current_position"][:110])
    if e.get("verdict_reason"):
        reasons.append(e["verdict_reason"][:110])

    return bias, score, [r for r in reasons if r][:5]


def _extract_news(n: Dict) -> tuple:
    score = float(n.get("confidence_score", 0))
    action = n.get("suggested_action", "NO POSITION")
    bias_text = n.get("fundamental_bias", "Neutral")

    bias = ("bullish" if "Bullish" in bias_text else
            "bearish" if "Bearish" in bias_text else "neutral")
    if action == "NO POSITION":
        bias = "neutral"

    reasons = [str(d) for d in n.get("top_drivers", []) if d][:3]
    return bias, score, reasons


def _wyckoff_adjustment(technical: Optional[Dict]) -> tuple[float, str | None]:
    """Return (score_delta, citation) from Wyckoff phase in technical analysis."""
    if not technical:
        return 0.0, None
    ms = technical.get("market_structure") or {}
    phase = ms.get("wyckoff_phase", "")
    context = ms.get("wyckoff_context", "")
    delta = _WYCKOFF_BOOST.get(phase, _WYCKOFF_REDUCE.get(phase, 0.0))
    citation = f"Wyckoff Phase: {phase} — {context}" if phase and phase != "INDETERMINATE" else None
    return delta, citation


def _mtf_aligned(technical: Optional[Dict]) -> bool:
    """Check MTF alignment from technical trade plan."""
    if not technical:
        return True
    tp = technical.get("trade_plan") or {}
    ms = technical.get("market_structure") or {}
    return bool(tp.get("mtf_alignment", ms.get("mtf_alignment", True)))


def compute_confluence(
    technical: Optional[Dict] = None,
    elliott:   Optional[Dict] = None,
    news:      Optional[Dict] = None,
) -> Dict[str, Any]:

    sources: Dict[str, Dict] = {}
    if technical:
        b, s, r = _extract_technical(technical)
        sources["technical"] = {"bias": b, "score": s, "reasons": r}
    if elliott:
        b, s, r = _extract_elliott(elliott)
        sources["elliott"] = {"bias": b, "score": s, "reasons": r}
    if news:
        b, s, r = _extract_news(news)
        sources["news"] = {"bias": b, "score": s, "reasons": r}

    if not sources:
        return {"error": "No analysis data provided"}

    # Weighted average (normalize for available sources only)
    total_w = sum(WEIGHTS[k] for k in sources)
    weighted = sum(sources[k]["score"] * WEIGHTS[k] / total_w for k in sources)

    # Apply Wyckoff phase adjustment
    wyckoff_delta, wyckoff_citation = _wyckoff_adjustment(technical)
    weighted = max(0.0, min(100.0, weighted + wyckoff_delta))

    # MTF alignment gate: misalignment reduces score significantly
    mtf_ok = _mtf_aligned(technical)
    if not mtf_ok:
        weighted = max(0.0, weighted - 10.0)

    # Majority-vote bias
    bull = sum(1 for v in sources.values() if v["bias"] == "bullish")
    bear = sum(1 for v in sources.values() if v["bias"] == "bearish")
    n = len(sources)
    bias = "BUY" if bull > n / 2 else "SELL" if bear > n / 2 else "NEUTRAL"

    # Collect up to 5 reasons — include Wyckoff citation when available
    all_reasons = []
    if wyckoff_citation:
        all_reasons.append(wyckoff_citation)
    for src in ("technical", "elliott", "news"):
        if src in sources:
            all_reasons.extend(sources[src]["reasons"])
    why = [r for r in all_reasons if r][:5]

    # Risk factors
    risks = []
    if not mtf_ok:
        risks.append("MTF misalignment: short-term direction conflicts with medium-term trend")
    if elliott:
        alts = (elliott.get("alternative_counts") or [])
        if alts:
            risks.append(f"Alternate Elliott count: {alts[0].get('label','exists')}")
    if news and news.get("risk_notes"):
        risks.append(news["risk_notes"][:110])
    if technical:
        supply = ((technical.get("supply_demand") or {}).get("supply_zones") or [])
        if supply:
            risks.append(f"Supply zone resistance at {supply[0].get('price_range','')}")
    risks = [r for r in risks if r][:3]

    # Trade plan: prefer technical, fall back to Elliott
    trade_plan: Dict[str, Any] = {}
    if technical and (technical.get("trade_plan") or {}).get("valid_setup"):
        tp = technical["trade_plan"]
        trade_plan = {
            "entry": tp.get("entry_zone", "—"), "sl": tp.get("stop_loss", "—"),
            "tp1": tp.get("take_profit_1", "—"), "tp2": tp.get("take_profit_2", "—"),
            "rr": tp.get("rr_ratio", "—"), "direction": tp.get("direction", "None"),
            "mtf_alignment": mtf_ok,
        }
    elif elliott:
        tr = elliott.get("trade_recommendation") or {}
        if tr.get("action") not in ("NO_TRADE", "WAIT", None):
            trade_plan = {
                "entry": tr.get("entry_zone", "—"), "sl": tr.get("invalidation_level", "—"),
                "tp1": tr.get("target_1", "—"), "tp2": tr.get("target_2", "—"),
                "rr": "—", "direction": tr.get("direction", "None"),
                "mtf_alignment": mtf_ok,
            }

    # Knowledge citations — what concepts support this analysis
    citations = []
    if wyckoff_citation:
        citations.append(wyckoff_citation)
    wyckoff_phase = (technical or {}).get("market_structure", {}).get("wyckoff_phase", "")
    if wyckoff_phase in ("ACCUMULATION_C", "DISTRIBUTION_C"):
        citations.append("ICT: Liquidity sweep (Spring/UTAD) aligns with Wyckoff Phase C — highest-confidence reversal")
    if not mtf_ok:
        citations.append("Risk Management: MTF misalignment detected — reduce position size")
    premium_discount = (technical or {}).get("liquidity_analysis", {}).get("premium_discount", "")
    if premium_discount:
        citations.append(f"ICT Premium/Discount: Price in {premium_discount} zone")
    ote = (technical or {}).get("liquidity_analysis", {}).get("ote_zone")
    if ote:
        citations.append(f"ICT OTE (62-79% retracement zone): {ote}")

    final = round(weighted, 1)
    return {
        "institutional_score": final,
        "grade":              _first_match(final, GRADE_MAP),
        "bias":               bias,
        "confidence_label":   _first_match(final, CONFIDENCE_MAP),
        "confidence_pct":     round(weighted),
        "why_this_trade":     why,
        "risk_factors":       risks,
        "trade_plan":         trade_plan,
        "sources":            {k: {"bias": v["bias"], "score": round(v["score"], 1)}
                               for k, v in sources.items()},
        "knowledge_citations": citations,
        "mtf_alignment":      mtf_ok,
        "wyckoff_phase":      wyckoff_phase or "INDETERMINATE",
        "wyckoff_delta":      wyckoff_delta,
    }
