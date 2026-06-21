from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from data_fetcher import fetch_market_data, fetch_quote
from analyzer import analyze
from elliott_analyzer import analyze_elliott
from news_fetcher import fetch_all_news
from news_analyzer import analyze_news
from confluence_engine import compute_confluence
import json
import asyncio

app = FastAPI(title="Elite Trading Intelligence API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class AnalysisRequest(BaseModel):
    ticker: str
    timeframe: str
    api_key: str
    model: str = "claude-opus-4-8"


class NewsRequest(BaseModel):
    asset_name: str
    api_key: str
    model: str = "claude-opus-4-8"
    technical_bias: Optional[str] = None


class ConfluenceRequest(BaseModel):
    technical: Optional[dict] = None
    elliott:   Optional[dict] = None
    news:      Optional[dict] = None


@app.post("/analyze")
async def run_analysis(req: AnalysisRequest):
    try:
        market_data = fetch_market_data(req.ticker.strip().upper(), req.timeframe)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

    try:
        result = analyze(market_data, req.api_key.strip(), req.model)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}")

    result.setdefault("current_price", market_data["current_price"])
    result.setdefault("price_change_1d_pct", market_data["price_change_1d_pct"])
    return result


@app.post("/elliott")
async def run_elliott(req: AnalysisRequest):
    try:
        market_data = fetch_market_data(req.ticker.strip().upper(), req.timeframe)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data fetch error: {e}")

    try:
        result = analyze_elliott(market_data, req.api_key.strip(), req.model)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Elliott response as JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Elliott analysis error: {e}")

    return result


@app.post("/news")
async def run_news(req: NewsRequest):
    loop = asyncio.get_event_loop()
    try:
        news_items = await loop.run_in_executor(None, fetch_all_news, req.asset_name.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"News fetch error: {e}")

    try:
        result = analyze_news(
            asset_name=req.asset_name.strip(),
            news_items=news_items,
            api_key=req.api_key.strip(),
            model=req.model,
            technical_bias=req.technical_bias,
        )
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse news analysis: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"News analysis error: {e}")

    return result


@app.post("/confluence")
async def run_confluence(req: ConfluenceRequest):
    try:
        return compute_confluence(
            technical=req.technical,
            elliott=req.elliott,
            news=req.news,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Confluence error: {e}")


@app.get("/candles")
async def get_candles(ticker: str, timeframe: str):
    try:
        data = fetch_market_data(ticker.strip().upper(), timeframe)
        return {
            "candles":     data.get("recent_candles", []),
            "swing_highs": data.get("swing_levels", {}).get("swing_highs", []),
            "swing_lows":  data.get("swing_levels", {}).get("swing_lows", []),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/quote")
async def get_quote(ticker: str):
    try:
        return fetch_quote(ticker)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
