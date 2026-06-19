from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_fetcher import fetch_market_data, fetch_quote
from analyzer import analyze
import json

app = FastAPI(title="Elite Trading Intelligence API", version="1.0.0")

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

    # Ensure live price fields survive
    result.setdefault("current_price", market_data["current_price"])
    result.setdefault("price_change_1d_pct", market_data["price_change_1d_pct"])
    return result


@app.get("/quote")
async def get_quote(ticker: str):
    try:
        return fetch_quote(ticker)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
