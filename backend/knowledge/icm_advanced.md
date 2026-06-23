# ICT ADVANCED CONCEPTS KNOWLEDGE BASE
**Source:** ICT Mentorship — Inner Circle Trader (Michael J. Huddleston)  
**Purpose:** Advanced ICT/Smart Money Concepts beyond the basics already in analyzer.py

---

## PART 1: PREMIUM AND DISCOUNT ARRAYS

### 1.1 Core Concept
ICT divides every price swing into **Premium** (expensive) and **Discount** (cheap) zones using the 50% equilibrium of any measurable leg.

```
Swing High ─────────────────────────── 100% (Premium extreme)
                                        75% 
                                        61.8% (Premium zone upper)
OTE Zone ──────────────────────────── 62-79% (Premium OTE short)
                                        79%
Equilibrium ────────────────────────── 50% (Fair value)
OTE Zone ──────────────────────────── 21-38% (Discount OTE long)
                                        38.2% (Discount zone upper)
                                        25%
Swing Low ─────────────────────────── 0% (Discount extreme)
```

**Rule:**
- BUY in DISCOUNT (below 50% of the leg from swing low to swing high)
- SELL in PREMIUM (above 50% of the leg from swing low to swing high)
- The 50% level = ICT "Equilibrium" = the most important single price level in any range

**Why this matters:**
- Retail traders buy breakouts (premium) and sell breakdowns (discount) — precisely where institutions exit
- Institutions accumulate at discount, distribute at premium
- This is the micro-application of Wyckoff accumulation/distribution logic

### 1.2 Premium Zone Identification
Above the 50% equilibrium of the current range. Within premium:
- 61.8% Fibonacci = first significant level
- 70.5% = OTE (Optimal Trade Entry) for shorts
- 79% = extended OTE for shorts (last high-probability short level)
- Above 79% approaching the high = very premium; institutions distributing

### 1.3 Discount Zone Identification
Below the 50% equilibrium. Within discount:
- 38.2% = first significant level
- 29.5% = OTE (Optimal Trade Entry) for longs
- 21% = extended OTE for longs (last high-probability long level)
- Below 21% approaching the low = very discount; institutions accumulating

---

## PART 2: OPTIMAL TRADE ENTRY (OTE)

### 2.1 Definition
The OTE is the highest-probability entry zone within a retracement, calculated as the 62%-79% Fibonacci retracement of an impulse move.

**For LONG entry after bullish impulse:**
```
Measure the impulse move UP (from swing low to swing high)
OTE Long Zone = 62% to 79% retracement of that impulse move
             = Swing High − (Swing High − Swing Low) × 0.62 to 0.79
```

**For SHORT entry after bearish impulse:**
```
Measure the impulse move DOWN (from swing high to swing low)
OTE Short Zone = 62% to 79% retracement of that impulse move
              = Swing Low + (Swing High − Swing Low) × 0.62 to 0.79
```

### 2.2 OTE Validity Conditions
The OTE only has significance when these conditions are met:
1. There is a clear, identifiable impulse move (the "leg" being measured)
2. The direction of the trade ALIGNS with the higher timeframe trend
3. An Order Block or FVG exists within the OTE zone
4. The retracement shows diminishing momentum (RSI divergence, declining volume)

### 2.3 OTE as Target Confirmation
OTE is also used for targets:
- After a confirmed reversal, project OTE of the PRIOR RANGE as the target
- The 127.2% and 161.8% extensions of the measured leg = TP1 and TP2

### 2.4 The 0.705 Fibonacci Level
ICT specifically identifies 0.705 (70.5%) as the "true" OTE level within the 62-79% zone:
- This is the geometric mean of 0.618 and 0.786
- Price that reaches 0.705 retracement of an impulse has given back exactly the right amount to attract institutional buyers/sellers
- **Fibrios application:** When retracement hits 70-71% of the prior impulse, flag as OTE condition

---

## PART 3: POWER OF THREE (PO3) — ACCUMULATION / MANIPULATION / DISTRIBUTION

### 3.1 Core Model
Every significant price move follows a 3-phase structure:

**Phase 1 — ACCUMULATION:**
- Smart money accumulates positions at the lowest possible prices
- Price action appears choppy, sideways, with false moves in both directions
- Retail traders are confused — "no trend"
- Smart money is building the cause (Wyckoff alignment)

**Phase 2 — MANIPULATION:**
- A false move in the OPPOSITE direction of the eventual true move
- This is the "trap" — retail traders enter the wrong direction
- For a pending bull move: price first drops sharply below support (Spring = Manipulation)
- For a pending bear move: price first rallies above resistance (UTAD = Manipulation)
- Volume on manipulation move appears strong to retail traders (they see it as a trend)

**Phase 3 — DISTRIBUTION:**
- The TRUE directional move begins
- Smart money offloads to the retail traders who entered late in the correct direction
- Price moves decisively in the true direction, often with strong momentum initially
- Eventually, this becomes the next accumulation/distribution cycle

### 3.2 Daily PO3 Pattern
Each trading DAY follows PO3:

**Bullish Day:**
- Asian session (Accumulation): tight range, no direction
- London open (Manipulation): false move DOWN to hunt Asian session lows (stop hunt)
- NY open (Distribution): true move UP; price rallies through and above Asian high

**Bearish Day:**
- Asian session: tight range
- London open (Manipulation): false move UP to hunt Asian session highs  
- NY open (Distribution): true move DOWN

**Fibrios application:**
- If a bullish setup forms at NY open AFTER a London stop-hunt (liquidity sweep of Asian lows) → HIGH confidence LONG
- The stop-hunt = Manipulation phase complete → Distribution (true move) begins

### 3.3 Weekly PO3 Pattern
Same structure over a week:
- Monday-Tuesday: Accumulation / Manipulation (false move, often fades by Tuesday close)
- Wednesday-Thursday: True directional move (Distribution phase)
- Friday: Partial retracement or continuation

**Fibrios application:** 
- A setup that forms on Monday/Tuesday during manipulation is likely a TRAP
- Wait for Wednesday morning confirmation of true direction before entering
- Thursday setups in direction of weekly trend = late but still valid continuation

---

## PART 4: SINGLE INEFFICIENCY IN BODY / WICK (SIBI / BISI)

### 4.1 SIBI — Single Inefficiency in Body (Bearish)
**Definition:** A gap between the BODY of candle 1 and the BODY of candle 3 in a 3-candle sequence, where the gap is to the upside (price inefficiency above).

```
Candle 1 body top ─────────────┐
                                │ ← SIBI zone (bodies don't overlap)
Candle 3 body bottom ──────────┘
```

**Interpretation:** Price moved up too fast; there is an unfilled imbalance in the body structure. Price is likely to retrace to fill this gap.

**SIBI as resistance:**
- After a downward move creates SIBI, rallies back into the SIBI zone will face selling pressure
- ICT uses SIBI as a short entry zone on retracements
- **Stronger** than FVG because it references body closes (more significant than wicks)

### 4.2 BISI — Body Inefficiency in Single (Bullish)
**Definition:** A gap between the BODY of candle 1 and the BODY of candle 3, where the gap is to the downside (price inefficiency below).

```
Candle 3 body top ─────────────┐
                                │ ← BISI zone (bodies don't overlap)
Candle 1 body bottom ──────────┘
```

**Interpretation:** Price moved down too fast; there is an unfilled imbalance below.

**BISI as support:**
- After an upward move creates BISI, dips into the BISI zone will find buying support
- ICT uses BISI as a long entry zone on retracements
- **Stronger** than FVG because it references body closes

### 4.3 SIBI/BISI vs FVG
| Concept | What It References | Strength |
|---------|-------------------|---------|
| FVG (Fair Value Gap) | Wick-to-wick gap | Moderate |
| SIBI/BISI | Body-to-body gap | Strong (more significant) |
| Order Block | Full candle body | Very Strong |
| SIBI + OB overlap | Body gap AT order block | Extremely Strong |

---

## PART 5: MARKET MAKER MODEL

### 5.1 The Core Model
Market Makers (ICT's term for institutional participants) operate to:
1. Accumulate positions at advantageous prices
2. Drive price to take out retail stop-losses (liquidity raids)
3. Reverse price after the raid and move to their actual target

### 5.2 Market Maker Buy Model (Bullish)
**Setup sequence:**
1. Price creates a swing low with buy-side retail long stops below it
2. Market Maker drives price BELOW the swing low (sweeps buy stops)
3. Below the swing low, MM begins accumulation (buying cheap)
4. Price reverses sharply upward
5. Price rallies to the next sell-side liquidity pool (equal highs, prior resistance)
6. MM distributes at the resistance level

**ICT annotations for this sequence:**
- "Old Low Taken" = liquidity sweep (step 2)
- "Reversal" at demand/OB below old low (steps 3-4)
- "Target: Equal Highs" or "Previous High" (steps 5-6)

### 5.3 Market Maker Sell Model (Bearish)
**Setup sequence:**
1. Price creates a swing high with sell-side retail short stops above it
2. Market Maker drives price ABOVE the swing high (sweeps sell stops)
3. Above the swing high, MM begins distribution (selling expensive)
4. Price reverses sharply downward
5. Price drops to the next buy-side liquidity pool (equal lows, prior support)
6. MM accumulates at the support level

### 5.4 Market Maker Model Integration with Fibrios
When market maker model is identified:
- **Sweep + Immediate Reversal at OB/FVG** → Highest confidence entry signal
- Direction: AGAINST the sweep direction, IN the reversal direction
- Target: Previous opposing swing level (equal highs or equal lows on opposite side)
- Stop: Beyond the sweep extreme (beyond the low swept in bullish MM; beyond the high swept in bearish MM)

---

## PART 6: ICT TRADING WINDOWS AND SESSIONS

### 6.1 Session-Based Market Behavior

**Asian Session (7PM-2AM EST):**
- Low volatility, range-bound
- Sets the range that London/NY will manipulate
- Asian Highs and Lows = liquidity targets for London
- Best strategy: Identify the range; wait for the London manipulation

**London Session (2AM-5AM EST):**
- First major move of the day
- Often a manipulation — false break of Asian range in wrong direction
- London Kill Zone: 2AM-5AM EST — high-probability setup window
- After 5AM EST, if London created a false move: look for reversal to NY session

**New York AM Session (7AM-10AM EST — NY Kill Zone):**
- True directional move begins
- 8:30AM EST: US economic data (most news releases)
- 9:30AM EST: US equity market open — major volatility
- Best setups: 9:30-11AM after initial volatility settles

**New York Lunch (12PM-1PM EST):**
- Low volatility; avoid trading
- Market makers run stops during lunch (false moves)

**New York PM Session (1PM-4PM EST):**
- Second directional opportunity
- Often extends or completes the AM move
- 3PM-4PM: Pre-close accumulation/distribution

### 6.2 Silver Bullet Trade Concept
**Definition:** Specific 1-hour windows where ICT anticipates high-probability setups:

**Silver Bullet Windows:**
- 3AM-4AM EST (London Silver Bullet)
- 10AM-11AM EST (NY AM Silver Bullet)
- 2PM-3PM EST (NY PM Silver Bullet)

**Setup conditions within Silver Bullet window:**
1. FVG forms on the opening of the window
2. Price trades down into the FVG from above (bullish) or up into FVG from below (bearish)
3. Entry at FVG, stop beyond FVG, target = previous swing in the trend direction

---

## PART 7: ICT CONCEPT ALIGNMENT SUMMARY

### 7.1 Complete ICT Entry Checklist

For a high-confidence ICT entry, the following should align:

| Criterion | Bullish Version | Bearish Version |
|-----------|----------------|----------------|
| HTF Trend | Bullish (higher highs, higher lows) | Bearish (lower highs, lower lows) |
| PO3 Phase | Price in manipulation (fake down move) | Price in manipulation (fake up move) |
| Liquidity Taken | Buy stops below swing low swept | Sell stops above swing high swept |
| Premium/Discount | Price in Discount zone (< 50% of range) | Price in Premium zone (> 50% of range) |
| OTE | Price at 62-79% retracement of prior upleg | Price at 62-79% retracement of prior downleg |
| OB/FVG/BISI present | Yes — demand zone at OTE level | Yes — supply zone at OTE level |
| Candle pattern | Bullish rejection (hammer, engulfing) | Bearish rejection (shooting star, engulfing) |
| Session timing | Within a Kill Zone window | Within a Kill Zone window |

**Score:** Each criterion met = 1 point. Maximum 8 points.
- 7-8: Extremely high-confidence (Elite Setup equivalent)
- 5-6: High-confidence
- 3-4: Moderate — ensure R:R ≥ 2.5
- 1-2: Low-confidence — skip

---

*Source: ICT Mentorship Program (2016-2023). Inner Circle Trader. Available at: theinnercircletrader.com*
