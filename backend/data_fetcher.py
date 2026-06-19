import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, Any

# Maps common user-friendly names → yfinance symbols
SYMBOL_MAP: Dict[str, str] = {
    # Forex
    "EURUSD": "EURUSD=X", "GBPUSD": "GBPUSD=X", "USDJPY": "USDJPY=X",
    "USDCHF": "USDCHF=X", "AUDUSD": "AUDUSD=X", "NZDUSD": "NZDUSD=X",
    "USDCAD": "USDCAD=X", "EURGBP": "EURGBP=X", "EURJPY": "EURJPY=X",
    "GBPJPY": "GBPJPY=X", "EURAUD": "EURAUD=X", "EURCAD": "EURCAD=X",
    "EURCHF": "EURCHF=X", "GBPCHF": "GBPCHF=X", "AUDJPY": "AUDJPY=X",
    "AUDCAD": "AUDCAD=X", "AUDNZD": "AUDNZD=X", "NZDJPY": "NZDJPY=X",
    "CADJPY": "CADJPY=X", "CHFJPY": "CHFJPY=X", "USDMXN": "USDMXN=X",
    "USDZAR": "USDZAR=X", "USDNOK": "USDNOK=X", "USDSEK": "USDSEK=X",
    "USDSGD": "USDSGD=X", "USDHKD": "USDHKD=X", "USDCNH": "USDCNH=X",
    "USDINR": "USDINR=X", "USDTRY": "USDTRY=X",
    # Commodities (common aliases → futures)
    "GOLD":      "GC=F",  "XAUUSD":    "GC=F",  "XAU":       "GC=F",
    "SILVER":    "SI=F",  "XAGUSD":    "SI=F",  "XAG":       "SI=F",
    "OIL":       "CL=F",  "WTI":       "CL=F",  "CRUDE":     "CL=F",
    "USOIL":     "CL=F",  "CRUDEOIL":  "CL=F",
    "BRENT":     "BZ=F",  "UKOIL":     "BZ=F",
    "NATGAS":    "NG=F",  "NATURALGAS":"NG=F",  "GAS":       "NG=F",
    "COPPER":    "HG=F",  "PLATINUM":  "PL=F",  "PALLADIUM": "PA=F",
    "CORN":      "ZC=F",  "WHEAT":     "ZW=F",  "SOYBEAN":   "ZS=F",
    # Crypto
    "BTCUSD":  "BTC-USD",  "BTC":     "BTC-USD",  "BITCOIN":  "BTC-USD",
    "ETHUSD":  "ETH-USD",  "ETH":     "ETH-USD",  "ETHEREUM": "ETH-USD",
    "SOLUSD":  "SOL-USD",  "SOL":     "SOL-USD",
    "BNBUSD":  "BNB-USD",  "BNB":     "BNB-USD",
    "XRPUSD":  "XRP-USD",  "XRP":     "XRP-USD",
    "ADAUSD":  "ADA-USD",  "ADA":     "ADA-USD",
    "DOGEUSD": "DOGE-USD", "DOGE":    "DOGE-USD",
    "AVAXUSD": "AVAX-USD", "AVAX":    "AVAX-USD",
    "DOTUSD":  "DOT-USD",  "DOT":     "DOT-USD",
    "LINKUSD": "LINK-USD", "LINK":    "LINK-USD",
    # Indices
    "VIX":    "^VIX",  "US10Y":  "^TNX",
    "DAX":    "^GDAXI","FTSE":   "^FTSE",
    "NIKKEI": "^N225", "CAC40":  "^FCHI",
    "ASX200": "^AXJO",
}

def normalize_symbol(ticker: str) -> str:
    """Map user-friendly ticker names to correct yfinance symbols."""
    return SYMBOL_MAP.get(ticker.upper(), ticker)

TIMEFRAME_MAP: Dict[str, tuple] = {
    "1m":  ("5d",  "1m"),
    "5m":  ("60d", "5m"),
    "15m": ("60d", "15m"),
    "30m": ("60d", "30m"),
    "1h":  ("60d", "1h"),
    "4h":  ("60d", "1h"),   # resampled below
    "1d":  ("2y",  "1d"),
    "1w":  ("5y",  "1wk"),
}


def _resample_4h(df: pd.DataFrame) -> pd.DataFrame:
    return df.resample("4h").agg(
        {"Open": "first", "High": "max", "Low": "min", "Close": "last", "Volume": "sum"}
    ).dropna()


def _swing_levels(df: pd.DataFrame, n: int = 6) -> Dict:
    highs, lows = [], []
    for i in range(2, len(df) - 2):
        if (df["High"].iloc[i] > df["High"].iloc[i - 1]
                and df["High"].iloc[i] > df["High"].iloc[i - 2]
                and df["High"].iloc[i] > df["High"].iloc[i + 1]
                and df["High"].iloc[i] > df["High"].iloc[i + 2]):
            highs.append(round(float(df["High"].iloc[i]), 4))
        if (df["Low"].iloc[i] < df["Low"].iloc[i - 1]
                and df["Low"].iloc[i] < df["Low"].iloc[i - 2]
                and df["Low"].iloc[i] < df["Low"].iloc[i + 1]
                and df["Low"].iloc[i] < df["Low"].iloc[i + 2]):
            lows.append(round(float(df["Low"].iloc[i]), 4))
    return {"swing_highs": highs[-n:], "swing_lows": lows[-n:]}


def _indicators(df: pd.DataFrame) -> Dict:
    close = df["Close"]
    n = len(df)

    sma20  = round(float(close.rolling(20).mean().iloc[-1]),  4) if n >= 20  else None
    sma50  = round(float(close.rolling(50).mean().iloc[-1]),  4) if n >= 50  else None
    sma200 = round(float(close.rolling(200).mean().iloc[-1]), 4) if n >= 200 else None
    ema20  = round(float(close.ewm(span=20, adjust=False).mean().iloc[-1]), 4)

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs   = gain / loss.replace(0, np.nan)
    rsi  = round(float((100 - 100 / (1 + rs)).iloc[-1]), 2)

    hl   = df["High"] - df["Low"]
    hc   = (df["High"] - df["Close"].shift()).abs()
    lc   = (df["Low"]  - df["Close"].shift()).abs()
    atr  = round(float(pd.concat([hl, hc, lc], axis=1).max(axis=1).rolling(14).mean().iloc[-1]), 4)

    avg_vol = int(df["Volume"].rolling(20).mean().iloc[-1])
    cur_vol = int(df["Volume"].iloc[-1])
    vol_ratio = round(cur_vol / avg_vol, 2) if avg_vol else 1.0

    prev_close = float(close.iloc[-2]) if n >= 2 else float(close.iloc[-1])
    change_pct = round((float(close.iloc[-1]) - prev_close) / prev_close * 100, 2)

    return {
        "sma20": sma20, "sma50": sma50, "sma200": sma200, "ema20": ema20,
        "rsi": rsi, "atr": atr,
        "avg_volume_20": avg_vol, "current_volume": cur_vol, "volume_ratio": vol_ratio,
        "price_change_pct": change_pct,
    }


def _recent_candles(df: pd.DataFrame, n: int = 30) -> list:
    rows = []
    for idx, row in df.tail(n).iterrows():
        date_str = idx.date().isoformat() if hasattr(idx, "date") else str(idx)
        rows.append({
            "date":   date_str,
            "open":   round(float(row["Open"]),   4),
            "high":   round(float(row["High"]),   4),
            "low":    round(float(row["Low"]),    4),
            "close":  round(float(row["Close"]),  4),
            "volume": int(row["Volume"]),
        })
    return rows


def fetch_quote(ticker: str) -> Dict[str, Any]:
    """Fast single-price lookup for the live price bar."""
    yf_symbol = normalize_symbol(ticker)
    t = yf.Ticker(yf_symbol)
    df = t.history(period="2d", interval="1d", auto_adjust=True)
    if df.empty:
        raise ValueError(f"No data for '{ticker}'")
    price = round(float(df["Close"].iloc[-1]), 4)
    prev  = round(float(df["Close"].iloc[-2]), 4) if len(df) >= 2 else price
    change_pct = round((price - prev) / prev * 100, 2) if prev else 0
    return {"symbol": yf_symbol, "price": price, "change_pct": change_pct}


def fetch_market_data(ticker: str, timeframe: str) -> Dict[str, Any]:
    ticker = normalize_symbol(ticker)
    period, interval = TIMEFRAME_MAP.get(timeframe, ("2y", "1d"))
    t = yf.Ticker(ticker)
    df = t.history(period=period, interval=interval, auto_adjust=True)

    if df.empty:
        raise ValueError(f"No price data found for '{ticker}'")

    if timeframe == "4h":
        df = _resample_4h(df)

    info = {}
    try:
        info = t.info
    except Exception:
        pass

    ind = _indicators(df)
    return {
        "ticker":            ticker.upper(),
        "timeframe":         timeframe,
        "company_name":      info.get("longName", ticker.upper()),
        "sector":            info.get("sector", "Unknown"),
        "market_cap":        info.get("marketCap"),
        "current_price":     round(float(df["Close"].iloc[-1]), 4),
        "price_change_1d_pct": ind.pop("price_change_pct"),
        "period_high":       round(float(df["High"].max()), 4),
        "period_low":        round(float(df["Low"].min()), 4),
        "swing_levels":      _swing_levels(df),
        "indicators":        ind,
        "recent_candles":    _recent_candles(df, 30),
        "data_points":       len(df),
    }
