# PATTERN DATABASE KNOWLEDGE BASE
**Sources:** Japanese Candlestick Charting Techniques — Steve Nison; Encyclopedia of Chart Patterns — Thomas Bulkowski  
**Purpose:** Formal candlestick and chart pattern recognition with targets for the Fibrios analyzer

---

## PART 1: CANDLESTICK PATTERNS

### 1.1 SINGLE CANDLESTICK PATTERNS

#### HAMMER (Bullish Reversal)
**Appearance:** Small body at top of candle range, long lower wick (≥2x body), little or no upper wick.  
**Location:** Must appear at bottom of downtrend / at support / demand zone.  
**Signal:** Long lower wick = smart money buying into weakness; price rejected lower levels.  
**Confirmation:** Next candle closes above hammer's body.  
**Reliability:** High when at key support (Bulkowski win rate: ~60-65%)  
**Fibrios tag:** `"Hammer — bullish reversal at support"`

#### SHOOTING STAR (Bearish Reversal)
**Appearance:** Small body at bottom of candle range, long upper wick (≥2x body), little or no lower wick.  
**Location:** Must appear at top of uptrend / at resistance / supply zone.  
**Signal:** Long upper wick = smart money selling into strength; price rejected higher levels.  
**Confirmation:** Next candle closes below shooting star's body.  
**Reliability:** High when at key resistance (Bulkowski win rate: ~59%)  
**Fibrios tag:** `"Shooting Star — bearish reversal at resistance"`

#### DOJI (Indecision)
**Appearance:** Open ≈ Close; upper and lower wicks present.  
**Signal:** Market indecision — supply and demand in near-perfect balance.  
**Context-dependent interpretation:**
- After uptrend at resistance: bearish reversal warning
- After downtrend at support: bullish reversal warning
- During consolidation: no signal (continuation)

**Types:**
- **Standard Doji:** Equal wicks both sides
- **Long-legged Doji:** Very long wicks both sides — extreme indecision
- **Dragonfly Doji:** Long lower wick only — bullish when at support
- **Gravestone Doji:** Long upper wick only — bearish when at resistance

**Fibrios tag:** `"Doji at [support/resistance] — indecision / potential reversal"`

#### MARUBOZU (Strong Momentum)
**Appearance:** Full-body candle with no wicks (or very small wicks). Open = Low (bullish) or Open = High (bearish).  
**Signal:** One-sided market control — no hesitation, buyers/sellers in complete command.  
**Bullish Marubozu:** Opens at low, closes at high — maximum bullish conviction
**Bearish Marubozu:** Opens at high, closes at low — maximum bearish conviction  
**Reliability:** Very high for trend continuation signals.  
**Fibrios tag:** `"Bullish/Bearish Marubozu — momentum confirmation"`

#### SPINNING TOP (Indecision, Less Significant than Doji)
**Appearance:** Small body, wicks on both sides of similar length.  
**Signal:** Modest indecision; market tested both directions and returned to center.

#### PIN BAR (Rejection Candle — broader term)
**Definition:** Any candle with a wick ≥3x the body size, rejecting a key level.  
**Bullish Pin Bar:** Long lower wick at support/demand zone
**Bearish Pin Bar:** Long upper wick at resistance/supply zone  
**Fibrios tag:** `"Pin Bar rejection at [level] — institutional rejection"`

---

### 1.2 DUAL CANDLESTICK PATTERNS

#### BULLISH ENGULFING
**Appearance:** 
- Candle 1: Bearish (down) candle
- Candle 2: Bullish (up) candle whose body completely engulfs Candle 1's body

**Signal:** Decisive reversal of selling pressure by buyers. Strong when at demand zone.  
**Confirmation:** Candle 3 closes above engulfing candle's high.  
**Bulkowski statistics:** ~63% win rate at key support levels  
**Fibrios tag:** `"Bullish Engulfing — demand absorption confirmed"`

#### BEARISH ENGULFING
**Appearance:**
- Candle 1: Bullish (up) candle
- Candle 2: Bearish (down) candle whose body completely engulfs Candle 1's body

**Signal:** Decisive reversal of buying pressure by sellers. Strong when at supply zone.  
**Bulkowski statistics:** ~60% win rate at key resistance levels  
**Fibrios tag:** `"Bearish Engulfing — supply absorption confirmed"`

#### TWEEZER TOPS / BOTTOMS
**Appearance:** Two candles with matching highs (tops) or matching lows (bottoms).  
**Tweezer Top:** Two candles with same high, first bullish, second bearish → bearish reversal
**Tweezer Bottom:** Two candles with same low, first bearish, second bullish → bullish reversal  
**Signal:** Second test of same level rejected — institutional defense of the level.  
**Fibrios tag:** `"Tweezer Top/Bottom — double rejection at [level]"`

#### HARAMI (Inside Bar)
**Appearance:** Second candle's body is contained within the first candle's body.  
**Signal:** Contraction of momentum; potential reversal or pause.  
**Bullish Harami:** After downtrend → buying beginning; watch for third candle confirmation
**Bearish Harami:** After uptrend → selling beginning; watch for third candle confirmation

---

### 1.3 THREE-CANDLE PATTERNS

#### MORNING STAR (Bullish Reversal)
**Structure:**
1. Large bearish candle (downtrend continuation)
2. Small candle (doji or spinning top) — gap down preferred; indecision
3. Large bullish candle closing above midpoint of Candle 1

**Signal:** Bears exhaust, brief indecision, then bulls take control.  
**Reliability:** High (Bulkowski: ~53% favorable reversal with volume confirmation)  
**Fibrios tag:** `"Morning Star — bullish reversal sequence"`

#### EVENING STAR (Bearish Reversal)
**Structure:**
1. Large bullish candle (uptrend continuation)
2. Small candle (doji or spinning top) — gap up preferred
3. Large bearish candle closing below midpoint of Candle 1

**Signal:** Bulls exhaust, brief indecision, then bears take control.  
**Fibrios tag:** `"Evening Star — bearish reversal sequence"`

#### THREE WHITE SOLDIERS (Bullish Continuation)
**Structure:** Three consecutive bullish candles, each opening within prior candle's body and closing higher.  
**Signal:** Strong bullish momentum; wave 3 characteristics in Elliott terms.  
**Fibrios tag:** `"Three White Soldiers — impulse momentum"`

#### THREE BLACK CROWS (Bearish Continuation)
**Structure:** Three consecutive bearish candles, each opening within prior candle's body and closing lower.  
**Signal:** Strong bearish momentum; bearish impulse wave characteristics.  
**Fibrios tag:** `"Three Black Crows — bearish impulse momentum"`

---

## PART 2: CHART PATTERNS

### 2.1 REVERSAL PATTERNS

#### HEAD AND SHOULDERS (Bearish Reversal)
**Structure:**
- Left shoulder: Rally → pullback to neckline
- Head: Larger rally (new high) → pullback to neckline (same level)
- Right shoulder: Rally (fails below head) → breaks neckline

**Neckline:** The horizontal/slightly angled line connecting the two pullback lows.

**Entry:** Short when price closes below neckline.  
**Stop Loss:** Above right shoulder high.  
**Target:** Neckline − (Head − Neckline) = Pattern height projected down from breakdown point.

**Volume confirmation:**
- Left shoulder: moderate volume on rally
- Head: high volume on rally, lower on decline
- Right shoulder: low volume on rally (failure) → high volume on neckline break

**Bulkowski statistics:**
- Appears in 83% of cases as a reversal pattern
- Average decline after neckline break: 22%
- Partial decline first (throwback) occurs in 45% of cases

**Fibrios tag:** `"H&S — target: [neckline − pattern_height]"`

#### INVERSE HEAD AND SHOULDERS (Bullish Reversal)
Mirror image of Head and Shoulders.  
**Entry:** Long when price closes above neckline.  
**Target:** Neckline + (Neckline − Head) = pattern height projected up.  
**Fibrios tag:** `"Inverse H&S — target: [neckline + pattern_height]"`

#### DOUBLE TOP (Bearish Reversal)
**Structure:**
- Two peaks at approximately the same high level
- Valley between the peaks (the "neckline")
- Second peak may be slightly lower than first

**Entry:** Short when price closes below the valley low.  
**Stop Loss:** Above either peak.  
**Target:** Valley − (Peak − Valley) = pattern height down from breakdown.

**Volume confirmation:** First peak has higher volume than second peak.  
**Time between peaks:** More significant if peaks are 4+ weeks apart.

**Bulkowski statistics:**
- Average decline: 19%
- 71% successful reversal rate (when neckline breaks)

**Fibrios tag:** `"Double Top — target: [valley − pattern_height]"`

#### DOUBLE BOTTOM (Bullish Reversal)
Mirror image of Double Top.  
**Entry:** Long when price closes above the peak (neckline).  
**Target:** Peak + (Peak − Trough) = pattern height up from breakout.  
**Bulkowski statistics:** Average gain 35%; 64% of targets reached.  
**Fibrios tag:** `"Double Bottom — target: [peak + pattern_height]"`

---

### 2.2 CONTINUATION PATTERNS

#### BULL FLAG (Bullish Continuation)
**Structure:**
1. Flagpole: Sharp, near-vertical rally (impulse move, often Wave 3 or Wave 1)
2. Flag: Gradual, parallel-channel pullback (45° or less decline) on declining volume

**Entry:** Long when price breaks above upper flag trendline.  
**Stop Loss:** Below lower flag trendline.  
**Target:** Entry + Flagpole height (measured from base of flagpole).

**Volume:** Flagpole on high volume; flag on declining volume; breakout on surge.  
**Time:** Flag consolidates 1-4 weeks ideally; if too long, it becomes a rectangle.

**Bulkowski statistics:**
- Average gain: 23%
- 67% of targets reached
- Upward breakout: 64% of cases (rest continue down)

**Fibrios tag:** `"Bull Flag — target: [entry + flagpole_height]"`

#### BEAR FLAG (Bearish Continuation)
Mirror image of Bull Flag.  
**Entry:** Short when price breaks below lower flag trendline.  
**Target:** Entry − Flagpole height.  
**Fibrios tag:** `"Bear Flag — target: [entry − flagpole_height]"`

#### ASCENDING TRIANGLE (Bullish Continuation/Reversal)
**Structure:**
- Flat upper resistance (horizontal) — equal highs
- Rising lower trendline — higher lows
- Pattern: buyers are becoming more aggressive; sellers holding a fixed level

**Entry:** Long when price closes above horizontal resistance.  
**Target:** Horizontal resistance + (Resistance − First low of pattern).  
**Volume:** Declining during formation; surge on breakout.

**Note:** Ascending triangles at resistance level = reversal possible. At support or mid-trend = continuation.  
**Bulkowski statistics:** 77% breakout upward; average gain: 35%  
**Fibrios tag:** `"Ascending Triangle — target: [resistance + pattern_height]"`

#### DESCENDING TRIANGLE (Bearish Continuation/Reversal)
**Structure:**
- Flat lower support (horizontal) — equal lows
- Falling upper trendline — lower highs

**Entry:** Short when price closes below horizontal support.  
**Target:** Support − (First high − Support).  
**Bulkowski statistics:** 72% breakout downward; average decline: 19%  
**Fibrios tag:** `"Descending Triangle — target: [support − pattern_height]"`

#### SYMMETRICAL TRIANGLE (Breakout — Direction Unknown)
**Structure:**
- Both upper and lower trendlines converging
- Lower highs + higher lows

**Breakout:** Can go either direction — bias from prior trend.  
**Target:** Measured from breakout point; pattern height from widest part.  
**Volume:** Declining to apex; surge at breakout.  
**Entry:** Wait for confirmed close outside triangle.  
**Fibrios note:** In Elliott terms, often a Wave 4 triangle or Wave B triangle.

#### CUP AND HANDLE (Bullish Continuation)
**Structure:**
1. Cup: U-shaped base (not V-shaped) with a slightly lower right rim
2. Handle: Small downward drift after the right rim, on low volume (5-30% retracement of cup)

**Entry:** Long when price breaks above cup rim.  
**Target:** Entry + Cup depth (from rim to bottom of cup).  
**Volume:** Low in cup base, rising on right side, declining in handle, surge at breakout.  
**Bulkowski statistics:** 61% success rate; average gain: 34%  
**Fibrios tag:** `"Cup & Handle — target: [rim + cup_depth]"`

---

### 2.3 WEDGE PATTERNS

#### RISING WEDGE (Bearish)
**Structure:**
- Both upper and lower trendlines slope upward
- But converging — the rally is losing momentum

**Entry:** Short when price closes below lower trendline.  
**Target:** Entry − Pattern height (top of wedge − bottom of wedge at widest point).  
**Volume:** Should decline during formation — diminishing buying interest.  
**Fibonacci context:** Often end of Wave 5 (ending diagonal) or Wave C.  
**Bulkowski statistics:** 69% break downward; average decline: 21%  
**Fibrios tag:** `"Rising Wedge — bearish exhaustion, target: [entry − height]"`

#### FALLING WEDGE (Bullish)
**Structure:**
- Both trendlines slope downward but converging.

**Entry:** Long when price closes above upper trendline.  
**Target:** Entry + Pattern height.  
**Bulkowski statistics:** 68% break upward; average gain: 38%  
**Fibrios tag:** `"Falling Wedge — bullish exhaustion, target: [entry + height]"`

---

### 2.4 GAP PATTERNS

#### BREAKAWAY GAP
**Definition:** Gap at the start of a new trend, breaking out of a base/consolidation.  
**Signal:** Strong momentum initiation. Gap often not filled immediately.  
**Volume:** High on the gap candle.  
**Fibrios implication:** Often coincides with BOS (Break of Structure) in ICT.

#### RUNAWAY GAP (Continuation Gap / Measuring Gap)
**Definition:** Gap occurring in the middle of a trend, confirming momentum.  
**Target use:** Distance from start of trend to gap = distance from gap to target.  
**Volume:** Moderate on the gap.

#### EXHAUSTION GAP
**Definition:** Gap near the END of a trend.  
**Signal:** Final burst of momentum before reversal.  
**Characteristics:** High volume on gap candle but price quickly reverses.  
**Fibrios implication:** Exhaustion gap + Elliott Wave 5 + RSI divergence = strongest reversal signal.

#### FAIR VALUE GAP (FVG) — ICT Terminology
**Definition:** A 3-candle imbalance where the high of candle 1 is below the low of candle 3 (bullish FVG) or the low of candle 1 is above the high of candle 3 (bearish FVG).  
**Bullish FVG:** Gap down-to-up — imbalance left on the upside; price likely to return and fill.  
**Bearish FVG:** Gap up-to-down — imbalance left on the downside; price likely to return and fill.  
**Fibrios tag:** `"FVG at [price_range] — likely retest zone"`

---

## PART 3: PATTERN QUALITY SCORING FOR FIBRIOS

### 3.1 Pattern Quality Score (0-100)

Each pattern identified gets a quality score based on context:

| Factor | Score | Points |
|--------|-------|--------|
| At key level (support/resistance/OB/FVG) | Yes | +30 |
| Volume confirms pattern | Yes | +25 |
| Trend alignment (pattern agrees with HTF) | Yes | +20 |
| Pattern size (≥1 ATR) | Yes | +10 |
| Clean formation (textbook structure) | Yes | +15 |

### 3.2 Pattern + ICT Alignment (Double Confirmation)

Highest-probability setups occur when a candlestick pattern forms AT an ICT/Wyckoff level:

| Pattern | ICT Level | Combined Signal |
|---------|-----------|----------------|
| Hammer / Bullish Engulfing | Demand zone / Order block | Extremely high-confidence LONG |
| Shooting Star / Bearish Engulfing | Supply zone / Order block | Extremely high-confidence SHORT |
| Pin Bar rejection | FVG midpoint | Strong reversal signal |
| Doji | Equal highs/lows | Potential liquidity sweep forming |
| Morning/Evening Star | BOS retest (LPS/LPSY) | Trend continuation entry |
| Double Bottom | Wyckoff Spring level | Accumulation confirmation |
| Double Top | Wyckoff UTAD level | Distribution confirmation |
| Bull Flag | After BOS + first LPS | Wave 3 continuation |

### 3.3 Pattern Target Integration with Fibonacci
Always cross-reference chart pattern targets with Fibonacci extension levels:

- H&S target should align with 1.272 or 1.618 extension of prior leg
- Double bottom target should align with 1.0 or 1.272 extension of cup depth
- Flag target should align with 1.618 extension of Wave 1
- Triangle breakout target should align with next Fibonacci level

When pattern target = Fibonacci extension = prior support/resistance = ICT target → HIGHEST confidence target zone.

---

*Sources: Nison, S. (1991). Japanese Candlestick Charting Techniques. New York Institute of Finance. | Bulkowski, T. (2021). Encyclopedia of Chart Patterns (3rd ed.). Wiley.*
