# RISK MANAGEMENT KNOWLEDGE BASE
**Source:** Trade Your Way to Financial Freedom — Van K. Tharp; ATR-Based Position Sizing Standards  
**Purpose:** Formal position sizing, drawdown rules, and risk discipline for the Fibrios trade plan

---

## PART 1: CORE RISK MANAGEMENT PRINCIPLES (Van Tharp)

### 1.1 The Three Pillars of Survival

**Pillar 1: Never Risk More Than You Can Afford to Lose**
The primary rule of trading is capital preservation. Without capital, there is no trading.

**Pillar 2: Position Sizing Determines Survival and Growth**
Van Tharp's key insight: Two traders with identical systems but different position sizing will have drastically different results. Position sizing is not a secondary consideration — it IS the system.

**Pillar 3: Expectancy × Position Frequency = Long-Term Result**
```
System Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss)
```
A positive expectancy system loses money if:
- Position sizes are inconsistent (random)
- Drawdown destroys capital before edge plays out
- Emotions cause rule violations

### 1.2 The R-Multiple System (Van Tharp's Framework)

**R = Initial Risk per Trade** (the dollar amount risked from entry to stop loss)

Every trade result is expressed as a multiple of R:
- Win of 2R = made 2x the risk
- Loss of 1R = lost the initial risk
- Win of 3R = made 3x the risk

**Why R-multiples?**
- Normalizes results across different instruments, prices, and volatility
- Makes system evaluation instrument-agnostic
- Enables calculation of true expectancy

**Target R-multiples by setup quality:**

| Confluence Score | Expected R:R Minimum | Trade Quality |
|----------------|---------------------|--------------|
| ≥ 90 (Elite Setup) | 3R or higher | Take full size |
| 80-89 (A+) | 2.5R | Take full size |
| 70-79 (A) | 2R | Take normal size |
| 60-69 (B) | 1.5R | Take reduced size |
| 50-59 (C) | Pass unless high R:R | Take 50% size max |
| < 50 | Do not trade | Skip |

**Rule:** Never take a trade with R:R below 1.5:1. Risk 1 to make less than 1.5 is a negative expectancy decision.

---

## PART 2: POSITION SIZING MODELS

### 2.1 Fixed Fractional Position Sizing (Primary Model)

**Formula:**
```
Position Size = (Account Size × Risk%) / (Entry Price − Stop Loss Price)
```

**Recommended risk percentages:**
| Account Size | Risk per Trade | Maximum Risk per Trade |
|-------------|---------------|----------------------|
| < $10,000 | 1.0% | 2.0% |
| $10,000 - $50,000 | 1.0% | 1.5% |
| $50,000 - $250,000 | 0.5% - 1.0% | 1.0% |
| > $250,000 | 0.25% - 0.5% | 0.75% |

**Example calculation:**
- Account: $50,000
- Risk per trade: 1% = $500
- Entry: $2,350 (XAUUSD)
- Stop Loss: $2,320 (distance = $30)
- Position Size = $500 / $30 = 16.67 oz (round down to 16 oz or 0.16 lots)

**Rule:** Always round DOWN. Never round up on position sizing.

### 2.2 ATR-Based Stop Sizing (Dynamic Volatility Adjustment)

**Formula:**
```
Stop Distance = N × ATR(14)
```

Where N is a multiplier based on setup type:
| Setup Type | ATR Multiplier (N) | Notes |
|------------|-------------------|-------|
| Scalp (< 1 hour) | 0.5 - 1.0 | Tight stop, high probability needed |
| Intraday (1-4H) | 1.0 - 1.5 | Standard |
| Swing (Daily) | 1.5 - 2.5 | Wider stop; accounts for noise |
| Position (Weekly) | 2.5 - 4.0 | Wide stop; high R:R required |

**Why ATR-based stops?**
- Markets breathe. A stop placed without regard for volatility will be hit by normal price fluctuation.
- ATR measures the average true range — the typical "noise" of the market.
- A stop inside 1 ATR will be hit by random movement; a stop beyond 1.5 ATR respects the noise.

**Dynamic position size with ATR:**
```
Stop Distance (price) = ATR(14) × N
Risk Amount ($) = Account × Risk%
Position Size = Risk Amount / Stop Distance
```

### 2.3 Scaled Entry (Pyramid) Rules

**Phase 1 entry:** 50% of planned size at initial signal (BOS or Spring confirmation)  
**Phase 2 entry:** Add 30% at LPS/LPSY confirmation (retest with low volume)  
**Phase 3 entry:** Add 20% after price clears a significant resistance/support (SOS confirmed)

**Rule:** Only add to winning positions. Never add to a losing position to "average down."
**Exception:** Averaging DOWN is only permitted when:
1. It was pre-planned before the trade
2. The additional entry has its own confluence setup
3. Total position stays within maximum risk limits

---

## PART 3: DRAWDOWN MANAGEMENT

### 3.1 Maximum Drawdown Rules

| Drawdown Level | Action Required |
|---------------|----------------|
| 5% of account | Review recent trades; check for pattern of errors |
| 10% of account | Mandatory 50% size reduction for remainder of week |
| 15% of account | Mandatory pause — review all recent trades; reassess market regime |
| 20% of account | Stop trading for minimum 1 week; strategic reassessment |
| 25% of account | Strategy-level review required before resuming |

**Van Tharp's key insight on drawdown:**
A 50% drawdown requires a 100% gain just to break even. Protection of capital is more important than maximizing returns.

| Drawdown | Gain Required to Recover |
|----------|------------------------|
| 10% | 11.1% |
| 20% | 25.0% |
| 30% | 42.9% |
| 40% | 66.7% |
| 50% | 100.0% |
| 75% | 300.0% |

### 3.2 Daily Loss Limit
**Maximum daily loss:** 3% of account.  
**Rule:** When daily loss exceeds 3%, stop trading for the rest of the day.  
**Rationale:** If you've lost 3% in one day, something is wrong — either the market is in an unfavorable regime, or your emotional state is impaired. Either way, stopping is the correct response.

### 3.3 Weekly Loss Limit
**Maximum weekly loss:** 5% of account.  
**Rule:** When weekly loss exceeds 5%, reduce all position sizes by 50% for the following week.

### 3.4 Consecutive Loss Rule
**After 3 consecutive losses:**
- Review each loss for process quality (was it a rule-based trade?)
- If all 3 were rule-based: market regime may have changed; reduce size 50%
- If any violated rules: identify the error pattern; mandatory review before next trade

---

## PART 4: RISK FACTORS BY ASSET CLASS

### 4.1 Forex Pairs (EUR/USD, GBP/USD)
**Typical ATR (daily):** 70-120 pips  
**Recommended stop:** 30-80 pips depending on timeframe  
**Session risk:** London/NY overlap has highest volatility → tighter stops can work  
**Overnight gap risk:** Low for major pairs on weekdays  
**Leverage caution:** Never exceed 10:1 effective leverage on any single position

### 4.2 Gold (XAUUSD)
**Typical ATR (daily):** $20-50  
**Recommended stop:** $15-40 depending on timeframe  
**News sensitivity:** Very high to USD news (Fed, CPI, NFP) — widen stops before data releases  
**Overnight risk:** Moderate — can gap on geopolitical news  
**Correlation risk:** Long Gold + Long USD exposure creates hidden negative correlation

### 4.3 Indices (S&P 500, NASDAQ, DAX)
**Typical ATR (daily):** 0.5-2.0% of index value  
**Recommended stop:** 0.5-1.5% below entry  
**Gap risk:** High — earnings season, overnight macro events  
**Correlation:** Watch for broad market correlation; if long 3 indices = 1 concentrated bet

### 4.4 Crypto (BTC, ETH)
**Typical ATR (daily):** 2-8% of price  
**Recommended stop:** 3-5% below entry (swing); 1-2% (intraday)  
**Risk multiplier:** Crypto requires 2x wider stops vs. forex → 2x smaller position size  
**Overnight risk:** Extreme — crypto trades 24/7; major moves happen outside peak hours

### 4.5 Oil (WTI)
**Typical ATR (daily):** $0.80-2.00  
**Recommended stop:** $0.50-1.50 depending on timeframe  
**EIA/OPEC risk:** Extreme volatility on inventory data and OPEC decisions — avoid holding through these

---

## PART 5: CORRELATION-BASED EXPOSURE LIMITS

### 5.1 Portfolio Heat
**Definition:** Total portfolio risk across all open positions simultaneously.

**Maximum portfolio heat:** 6% of account total (never risk more than this across all open trades combined).

**Rule of thumb:** If maximum risk per trade is 1%, never hold more than 6 uncorrelated trades simultaneously.

### 5.2 Correlation Groups and Limits

| Group | Assets | Max Concurrent Exposure |
|-------|--------|------------------------|
| Safe Haven | Gold (XAUUSD), Silver, JPY pairs | 2% combined |
| USD Risk | EUR/USD + GBP/USD (both vs USD) | 2% combined |
| Risk-On | Equities + Crypto | 3% combined |
| Oil Complex | WTI, energy stocks | 1.5% combined |
| DXY Correlated | Any 3+ USD pairs same direction | Treat as 1 trade |

**Example of correlation error:**
- Long EUR/USD (1% risk)
- Long GBP/USD (1% risk)
- Long Gold (1% risk)
- All three are "short USD" trades — total exposure to USD reversal = 3% (not 3 separate 1% trades)
- **Correct approach:** Treat as 1.5% maximum combined "short USD" exposure

### 5.3 Cross-Asset Correlation Rules
| Positive Correlation | Implication |
|---------------------|-------------|
| Gold UP ↔ USD DOWN | Hedge: Long Gold + Short EUR/USD reduces net USD exposure |
| Stocks UP ↔ Crypto UP | They're both risk-on — limit combined exposure |
| USD UP ↔ Oil DOWN | Negative: Long USD + Long Oil = partial hedge |
| USD UP ↔ Gold DOWN | Negative: Hedge or reduction of one position required |

---

## PART 6: RISK PER TRADE CALCULATOR (For Fibrios Output)

### 6.1 Standard Risk Calculation Formula
Given a trade plan from Fibrios analysis:

```python
def calculate_position_size(
    account_balance: float,
    risk_pct: float,       # e.g., 0.01 for 1%
    entry_price: float,
    stop_loss: float,
) -> dict:
    risk_amount = account_balance * risk_pct
    stop_distance = abs(entry_price - stop_loss)
    if stop_distance == 0:
        return {"error": "Stop distance is zero"}
    position_size = risk_amount / stop_distance
    return {
        "risk_amount_usd": round(risk_amount, 2),
        "stop_distance": round(stop_distance, 4),
        "position_size_units": round(position_size, 4),
        "position_size_lots": round(position_size / 100000, 4),  # for forex
        "risk_pct": risk_pct * 100,
    }
```

### 6.2 Fibrios Trade Plan Risk Addition
When outputting a trade plan, always include:

```json
{
  "entry": "2350.00",
  "stop_loss": "2320.00",
  "take_profit_1": "2410.00",
  "take_profit_2": "2460.00",
  "rr_ratio": "2.0",
  "direction": "Long",
  "position_sizing": {
    "stop_distance": "30.00",
    "risk_1pct_of_100k": "3.33 lots",
    "risk_0.5pct_of_100k": "1.67 lots",
    "atr_based_stop_valid": true,
    "atr_multiplier": "1.5x"
  }
}
```

---

## PART 7: RISK RED FLAGS — AVOID TRADING WHEN:

1. **News event within 30 minutes** — stop-loss placement is unpredictable
2. **Daily loss already at 2%** — emotional state likely compromised
3. **3+ consecutive losses today** — re-evaluate market regime fit
4. **VIX > 35 or ATR > 3x normal** — regime change; stops need widening; skip until stable
5. **Position would violate portfolio heat limit** — no new trades until existing close
6. **R:R ratio < 1.5:1** — below minimum threshold; skip regardless of setup quality
7. **Unclear stop level** — "somewhere below support" is not a stop; no trade without defined level
8. **Market in clear PANIC state** — no technical levels hold; wait for regime stabilization
9. **Conflicting news and technical** — when engines disagree strongly (confluence < 50), stand aside
10. **End of week (Friday after 2pm EST)** — gap risk over weekend; reduce or close positions

---

*Sources: Tharp, V.K. (1999). Trade Your Way to Financial Freedom. McGraw-Hill. | Tharp, V.K. (2008). Definitive Guide to Position Sizing. IITM.*
