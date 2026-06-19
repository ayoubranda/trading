// Comprehensive tradeable asset list with yfinance + TradingView symbol mapping
export const ASSETS = [
  // ── Forex Major ─────────────────────────────────────────────
  { label:"EUR/USD",  symbol:"EURUSD",  yf:"EURUSD=X",  tv:"FX:EURUSD",  type:"Forex",     aliases:["euro","eurodollar","fiber"] },
  { label:"GBP/USD",  symbol:"GBPUSD",  yf:"GBPUSD=X",  tv:"FX:GBPUSD",  type:"Forex",     aliases:["pound","cable","sterling"] },
  { label:"USD/JPY",  symbol:"USDJPY",  yf:"USDJPY=X",  tv:"FX:USDJPY",  type:"Forex",     aliases:["yen","ninja","gopher"] },
  { label:"USD/CHF",  symbol:"USDCHF",  yf:"USDCHF=X",  tv:"FX:USDCHF",  type:"Forex",     aliases:["swissie","franc"] },
  { label:"AUD/USD",  symbol:"AUDUSD",  yf:"AUDUSD=X",  tv:"FX:AUDUSD",  type:"Forex",     aliases:["aussie","australian"] },
  { label:"NZD/USD",  symbol:"NZDUSD",  yf:"NZDUSD=X",  tv:"FX:NZDUSD",  type:"Forex",     aliases:["kiwi","new zealand"] },
  { label:"USD/CAD",  symbol:"USDCAD",  yf:"USDCAD=X",  tv:"FX:USDCAD",  type:"Forex",     aliases:["loonie","canadian"] },
  // ── Forex Minor ──────────────────────────────────────────────
  { label:"EUR/GBP",  symbol:"EURGBP",  yf:"EURGBP=X",  tv:"FX:EURGBP",  type:"Forex",     aliases:["chunnel"] },
  { label:"EUR/JPY",  symbol:"EURJPY",  yf:"EURJPY=X",  tv:"FX:EURJPY",  type:"Forex",     aliases:["yuppy"] },
  { label:"GBP/JPY",  symbol:"GBPJPY",  yf:"GBPJPY=X",  tv:"FX:GBPJPY",  type:"Forex",     aliases:["geppy"] },
  { label:"EUR/AUD",  symbol:"EURAUD",  yf:"EURAUD=X",  tv:"FX:EURAUD",  type:"Forex",     aliases:[] },
  { label:"EUR/CAD",  symbol:"EURCAD",  yf:"EURCAD=X",  tv:"FX:EURCAD",  type:"Forex",     aliases:[] },
  { label:"EUR/CHF",  symbol:"EURCHF",  yf:"EURCHF=X",  tv:"FX:EURCHF",  type:"Forex",     aliases:[] },
  { label:"GBP/CHF",  symbol:"GBPCHF",  yf:"GBPCHF=X",  tv:"FX:GBPCHF",  type:"Forex",     aliases:[] },
  { label:"AUD/JPY",  symbol:"AUDJPY",  yf:"AUDJPY=X",  tv:"FX:AUDJPY",  type:"Forex",     aliases:[] },
  { label:"AUD/CAD",  symbol:"AUDCAD",  yf:"AUDCAD=X",  tv:"FX:AUDCAD",  type:"Forex",     aliases:[] },
  { label:"AUD/NZD",  symbol:"AUDNZD",  yf:"AUDNZD=X",  tv:"FX:AUDNZD",  type:"Forex",     aliases:[] },
  { label:"NZD/JPY",  symbol:"NZDJPY",  yf:"NZDJPY=X",  tv:"FX:NZDJPY",  type:"Forex",     aliases:[] },
  { label:"CAD/JPY",  symbol:"CADJPY",  yf:"CADJPY=X",  tv:"FX:CADJPY",  type:"Forex",     aliases:[] },
  { label:"CHF/JPY",  symbol:"CHFJPY",  yf:"CHFJPY=X",  tv:"FX:CHFJPY",  type:"Forex",     aliases:[] },
  { label:"USD/MXN",  symbol:"USDMXN",  yf:"USDMXN=X",  tv:"FX:USDMXN",  type:"Forex",     aliases:["mexican","peso"] },
  { label:"USD/ZAR",  symbol:"USDZAR",  yf:"USDZAR=X",  tv:"FX:USDZAR",  type:"Forex",     aliases:["rand","south africa"] },
  { label:"USD/NOK",  symbol:"USDNOK",  yf:"USDNOK=X",  tv:"FX:USDNOK",  type:"Forex",     aliases:["krone","norway"] },
  { label:"USD/SEK",  symbol:"USDSEK",  yf:"USDSEK=X",  tv:"FX:USDSEK",  type:"Forex",     aliases:["krona","sweden"] },
  { label:"USD/SGD",  symbol:"USDSGD",  yf:"USDSGD=X",  tv:"FX:USDSGD",  type:"Forex",     aliases:["singapore"] },
  { label:"USD/HKD",  symbol:"USDHKD",  yf:"USDHKD=X",  tv:"FX:USDHKD",  type:"Forex",     aliases:["hong kong"] },
  { label:"USD/CNH",  symbol:"USDCNH",  yf:"USDCNH=X",  tv:"FX:USDCNH",  type:"Forex",     aliases:["yuan","renminbi","china"] },
  { label:"USD/INR",  symbol:"USDINR",  yf:"USDINR=X",  tv:"FX:USDINR",  type:"Forex",     aliases:["rupee","india"] },
  { label:"USD/TRY",  symbol:"USDTRY",  yf:"USDTRY=X",  tv:"FX:USDTRY",  type:"Forex",     aliases:["lira","turkey"] },
  // ── Commodities ──────────────────────────────────────────────
  { label:"Gold (XAU/USD)",    symbol:"XAUUSD",   yf:"GC=F",   tv:"TVC:GOLD",       type:"Commodity", aliases:["gold","xau","xauusd","yellow metal"] },
  { label:"Silver (XAG/USD)",  symbol:"XAGUSD",   yf:"SI=F",   tv:"TVC:SILVER",     type:"Commodity", aliases:["silver","xag","xagusd"] },
  { label:"Crude Oil (WTI)",   symbol:"WTI",      yf:"CL=F",   tv:"TVC:USOIL",      type:"Commodity", aliases:["oil","wti","crude","usoil","petroleum"] },
  { label:"Brent Crude",       symbol:"BRENT",    yf:"BZ=F",   tv:"TVC:UKOIL",      type:"Commodity", aliases:["brent","ukoil","north sea"] },
  { label:"Natural Gas",       symbol:"NATGAS",   yf:"NG=F",   tv:"TVC:NATURALGAS", type:"Commodity", aliases:["gas","natgas","natural gas"] },
  { label:"Copper",            symbol:"COPPER",   yf:"HG=F",   tv:"TVC:COPPER",     type:"Commodity", aliases:["copper","dr copper"] },
  { label:"Platinum",          symbol:"PLATINUM", yf:"PL=F",   tv:"TVC:PLATINUM",   type:"Commodity", aliases:["platinum","xptusd"] },
  { label:"Palladium",         symbol:"PALLADIUM",yf:"PA=F",   tv:"TVC:PALLADIUM",  type:"Commodity", aliases:["palladium","xpdusd"] },
  { label:"Corn",              symbol:"CORN",     yf:"ZC=F",   tv:"CBOT:ZC1!",      type:"Commodity", aliases:["corn"] },
  { label:"Wheat",             symbol:"WHEAT",    yf:"ZW=F",   tv:"CBOT:ZW1!",      type:"Commodity", aliases:["wheat"] },
  { label:"Soybeans",          symbol:"SOYBEAN",  yf:"ZS=F",   tv:"CBOT:ZS1!",      type:"Commodity", aliases:["soy","soybeans"] },
  // ── Crypto ───────────────────────────────────────────────────
  { label:"Bitcoin (BTC)",    symbol:"BTCUSD",  yf:"BTC-USD",  tv:"BINANCE:BTCUSDT",  type:"Crypto", aliases:["bitcoin","btc"] },
  { label:"Ethereum (ETH)",   symbol:"ETHUSD",  yf:"ETH-USD",  tv:"BINANCE:ETHUSDT",  type:"Crypto", aliases:["ethereum","eth","ether"] },
  { label:"Solana (SOL)",     symbol:"SOLUSD",  yf:"SOL-USD",  tv:"BINANCE:SOLUSDT",  type:"Crypto", aliases:["solana","sol"] },
  { label:"BNB",              symbol:"BNBUSD",  yf:"BNB-USD",  tv:"BINANCE:BNBUSDT",  type:"Crypto", aliases:["bnb","binance coin"] },
  { label:"XRP",              symbol:"XRPUSD",  yf:"XRP-USD",  tv:"BINANCE:XRPUSDT",  type:"Crypto", aliases:["xrp","ripple"] },
  { label:"Cardano (ADA)",    symbol:"ADAUSD",  yf:"ADA-USD",  tv:"BINANCE:ADAUSDT",  type:"Crypto", aliases:["cardano","ada"] },
  { label:"Dogecoin (DOGE)",  symbol:"DOGEUSD", yf:"DOGE-USD", tv:"BINANCE:DOGEUSDT", type:"Crypto", aliases:["doge","dogecoin"] },
  { label:"Avalanche (AVAX)", symbol:"AVAXUSD", yf:"AVAX-USD", tv:"BINANCE:AVAXUSDT", type:"Crypto", aliases:["avax","avalanche"] },
  { label:"Polkadot (DOT)",   symbol:"DOTUSD",  yf:"DOT-USD",  tv:"BINANCE:DOTUSDT",  type:"Crypto", aliases:["dot","polkadot"] },
  { label:"Chainlink (LINK)", symbol:"LINKUSD", yf:"LINK-USD", tv:"BINANCE:LINKUSDT", type:"Crypto", aliases:["link","chainlink"] },
  { label:"Litecoin (LTC)",   symbol:"LTCUSD",  yf:"LTC-USD",  tv:"BINANCE:LTCUSDT",  type:"Crypto", aliases:["ltc","litecoin"] },
  { label:"TRON (TRX)",       symbol:"TRXUSD",  yf:"TRX-USD",  tv:"BINANCE:TRXUSDT",  type:"Crypto", aliases:["trx","tron"] },
  // ── Indices ──────────────────────────────────────────────────
  { label:"S&P 500 (SPY)",        symbol:"SPY",    yf:"SPY",    tv:"AMEX:SPY",    type:"Index", aliases:["sp500","s&p","spx","spy"] },
  { label:"NASDAQ 100 (QQQ)",     symbol:"QQQ",    yf:"QQQ",    tv:"NASDAQ:QQQ",  type:"Index", aliases:["nasdaq","qqq","tech"] },
  { label:"Dow Jones (DIA)",      symbol:"DIA",    yf:"DIA",    tv:"AMEX:DIA",    type:"Index", aliases:["dow","djia","dia"] },
  { label:"Russell 2000 (IWM)",   symbol:"IWM",    yf:"IWM",    tv:"AMEX:IWM",    type:"Index", aliases:["russell","small cap","iwm"] },
  { label:"VIX (Fear Index)",     symbol:"VIX",    yf:"^VIX",   tv:"TVC:VIX",     type:"Index", aliases:["vix","volatility","fear"] },
  { label:"US 10Y Treasury",      symbol:"US10Y",  yf:"^TNX",   tv:"TVC:US10Y",   type:"Index", aliases:["yield","bonds","10 year","treasury"] },
  { label:"DAX (Germany 40)",     symbol:"DAX",    yf:"^GDAXI", tv:"XETR:DAX",    type:"Index", aliases:["dax","germany","german"] },
  { label:"FTSE 100 (UK)",        symbol:"FTSE",   yf:"^FTSE",  tv:"TVC:UKX",     type:"Index", aliases:["ftse","uk","british"] },
  { label:"Nikkei 225 (Japan)",   symbol:"NIKKEI", yf:"^N225",  tv:"TVC:NI225",   type:"Index", aliases:["nikkei","japan","japanese"] },
  { label:"CAC 40 (France)",      symbol:"CAC40",  yf:"^FCHI",  tv:"EURONEXT:PX1",type:"Index", aliases:["cac","france","french"] },
  { label:"ASX 200 (Australia)",  symbol:"ASX200", yf:"^AXJO",  tv:"ASX:XJO",     type:"Index", aliases:["asx","australia","australian"] },
  // ── US Stocks ────────────────────────────────────────────────
  { label:"NVIDIA (NVDA)",           symbol:"NVDA",  yf:"NVDA",  tv:"NASDAQ:NVDA",  type:"Stock", aliases:["nvidia","nvda","gpu"] },
  { label:"Apple (AAPL)",            symbol:"AAPL",  yf:"AAPL",  tv:"NASDAQ:AAPL",  type:"Stock", aliases:["apple","aapl","iphone"] },
  { label:"Microsoft (MSFT)",        symbol:"MSFT",  yf:"MSFT",  tv:"NASDAQ:MSFT",  type:"Stock", aliases:["microsoft","msft"] },
  { label:"Amazon (AMZN)",           symbol:"AMZN",  yf:"AMZN",  tv:"NASDAQ:AMZN",  type:"Stock", aliases:["amazon","amzn","aws"] },
  { label:"Alphabet (GOOGL)",        symbol:"GOOGL", yf:"GOOGL", tv:"NASDAQ:GOOGL", type:"Stock", aliases:["google","alphabet","googl"] },
  { label:"Meta (META)",             symbol:"META",  yf:"META",  tv:"NASDAQ:META",  type:"Stock", aliases:["meta","facebook","instagram"] },
  { label:"Tesla (TSLA)",            symbol:"TSLA",  yf:"TSLA",  tv:"NASDAQ:TSLA",  type:"Stock", aliases:["tesla","tsla","ev"] },
  { label:"AMD (AMD)",               symbol:"AMD",   yf:"AMD",   tv:"NASDAQ:AMD",   type:"Stock", aliases:["amd","advanced micro"] },
  { label:"Netflix (NFLX)",          symbol:"NFLX",  yf:"NFLX",  tv:"NASDAQ:NFLX",  type:"Stock", aliases:["netflix","nflx"] },
  { label:"JPMorgan (JPM)",          symbol:"JPM",   yf:"JPM",   tv:"NYSE:JPM",     type:"Stock", aliases:["jpmorgan","jpm","bank"] },
  { label:"Berkshire Hathaway (BRK)",symbol:"BRK-B", yf:"BRK-B", tv:"NYSE:BRK.B",  type:"Stock", aliases:["berkshire","buffett","brk"] },
  { label:"Visa (V)",                symbol:"V",     yf:"V",     tv:"NYSE:V",       type:"Stock", aliases:["visa"] },
  { label:"Exxon Mobil (XOM)",       symbol:"XOM",   yf:"XOM",   tv:"NYSE:XOM",     type:"Stock", aliases:["exxon","xom","oil stock"] },
  { label:"Johnson & Johnson (JNJ)", symbol:"JNJ",   yf:"JNJ",   tv:"NYSE:JNJ",     type:"Stock", aliases:["johnson","jnj","pharma"] },
]

export const TYPE_COLORS = {
  Forex:     "#06b6d4",
  Commodity: "#f59e0b",
  Crypto:    "#8b5cf6",
  Index:     "#3b82f6",
  Stock:     "#10b981",
}

export function searchAssets(query) {
  if (!query || query.length < 1) return []
  const q = query.toLowerCase().trim()
  return ASSETS.filter(a =>
    a.label.toLowerCase().includes(q) ||
    a.symbol.toLowerCase().includes(q) ||
    a.aliases.some(al => al.includes(q))
  ).slice(0, 10)
}
