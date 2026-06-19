import { useState, useEffect, useRef } from 'react'

const TV_INTERVALS = {
  '1m': '1', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '4h': '240', '1d': 'D', '1w': 'W'
}

// ─── Score Gauge ─────────────────────────────────────────────
function ScoreGauge({ score, label }) {
  const r = 36, cx = 50, cy = 56
  const polar = (a) => {
    const rad = (a - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }
  const arc = (s, e) => {
    const p1 = polar(s), p2 = polar(e)
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${p2.x} ${p2.y}`
  }
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const endAngle = 135 + (score / 100) * 270

  return (
    <div className="gauge-container">
      <svg width="100" height="76" viewBox="0 0 100 76">
        <path d={arc(135, 405)} fill="none" stroke="#1e1e35" strokeWidth="8" strokeLinecap="round" />
        {score > 0 && (
          <path d={arc(135, endAngle)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        )}
        <text x="50" y="53" textAnchor="middle" fill={color} fontSize="17" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {score}
        </text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  )
}

// ─── Scenario Card ───────────────────────────────────────────
function ScenarioCard({ type, data }) {
  const cfg = {
    bullish: { color: '#10b981', icon: '▲' },
    bearish: { color: '#ef4444', icon: '▼' },
    neutral: { color: '#f59e0b', icon: '◆' },
  }
  const { color, icon } = cfg[type]
  return (
    <div className="scenario-card" style={{ borderLeftColor: color }}>
      <div className="scenario-header" style={{ color }}>
        <span>{icon}</span>
        <span>{type.toUpperCase()} SCENARIO</span>
        <span className="probability" style={{ background: color }}>{data.probability}%</span>
      </div>
      <div className="scenario-body">
        <div><span>Trigger:</span>{data.trigger}</div>
        <div><span>Target:</span>{data.target}</div>
        <div><span>Invalidation:</span>{data.invalidation}</div>
      </div>
      <div className="probability-bar">
        <div className="probability-fill" style={{ width: `${data.probability}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── TradingView Chart ───────────────────────────────────────
function TradingViewChart({ ticker, timeframe }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval: TV_INTERVALS[timeframe] || 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(8,8,16,1)',
      gridColor: 'rgba(30,30,53,0.5)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      support_host: 'https://www.tradingview.com',
    })
    ref.current.appendChild(script)
    return () => { if (ref.current) ref.current.innerHTML = '' }
  }, [ticker, timeframe])
  return <div className="tradingview-container"><div ref={ref} style={{ height: '100%', width: '100%' }} /></div>
}

// ─── Trend Badge ─────────────────────────────────────────────
function TrendBadge({ label, trend }) {
  const color = trend === 'Bullish' ? '#10b981' : trend === 'Bearish' ? '#ef4444' : '#f59e0b'
  return (
    <div className="trend-badge">
      <span style={{ color: '#475569', fontSize: '11px' }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: '13px', fontFamily: 'JetBrains Mono, monospace' }}>{trend}</span>
    </div>
  )
}

// ─── Zone Row ─────────────────────────────────────────────────
function ZoneRow({ zone, type }) {
  const color = type === 'supply' ? '#ef4444' : '#10b981'
  const opacity = zone.strength === 'Strong' ? 1 : zone.strength === 'Moderate' ? 0.75 : 0.45
  return (
    <div className="zone-row" style={{ borderLeftColor: color, opacity }}>
      <div className="zone-price">{zone.price_range}</div>
      <div className="zone-strength">{zone.strength}</div>
      {zone.notes && <div className="zone-notes">{zone.notes}</div>}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [ticker, setTicker] = useState('NVDA')
  const [timeframe, setTimeframe] = useState('1d')
  const [model, setModel] = useState('claude-opus-4-8')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('et_api_key') || '')
  const [showKey, setShowKey] = useState(!localStorage.getItem('et_api_key'))
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [chartSymbol, setChartSymbol] = useState('NVDA')
  const [chartTf, setChartTf] = useState('1d')

  const saveKey = (v) => { setApiKey(v); localStorage.setItem('et_api_key', v) }

  const gradeClass = !analysis ? '' :
    analysis.scores.overall >= 90 ? 'grade-aplus' :
    analysis.scores.overall >= 80 ? 'grade-a' :
    analysis.scores.overall >= 70 ? 'grade-b' :
    analysis.scores.overall >= 60 ? 'grade-c' : 'grade-reject'

  const run = async () => {
    if (!ticker.trim()) return setError('Enter a ticker symbol')
    if (!apiKey.trim()) return setError('Enter your Claude API key')
    setLoading(true); setError(null); setAnalysis(null)
    setChartSymbol(ticker.toUpperCase()); setChartTf(timeframe)
    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), timeframe, api_key: apiKey, model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Analysis failed')
      setAnalysis(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app" style={{ minHeight: '100vh' }}>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="logo">⬡</div>
          <div>
            <h1>Elite Trading Intelligence</h1>
            <p>INSTITUTIONAL-GRADE MARKET ANALYSIS</p>
          </div>
        </div>
        <div className="header-right">
          <button className="api-key-toggle" onClick={() => setShowKey(!showKey)}>
            {showKey ? '🔒 Hide' : '🔑 API Key'}
          </button>
          {showKey && (
            <input
              className="api-input"
              type="password"
              placeholder="sk-ant-api..."
              value={apiKey}
              onChange={e => saveKey(e.target.value)}
            />
          )}
        </div>
      </header>

      {/* ── Control Panel ── */}
      <div className="control-panel">
        <div className="control-group">
          <label>ASSET</label>
          <input
            className="ticker-input"
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && run()}
            placeholder="NVDA, SPY..."
          />
        </div>
        <div className="control-group">
          <label>TIMEFRAME</label>
          <select className="tf-select" value={timeframe} onChange={e => setTimeframe(e.target.value)}>
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="30m">30 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="1d">Daily</option>
            <option value="1w">Weekly</option>
          </select>
        </div>
        <div className="control-group">
          <label>AI MODEL</label>
          <select className="model-select" value={model} onChange={e => setModel(e.target.value)}>
            <option value="claude-opus-4-8">Opus 4.8 (Best)</option>
            <option value="claude-sonnet-4-6">Sonnet 4.6 (Fast)</option>
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 (Fastest)</option>
          </select>
        </div>
        <button className={`analyze-btn ${loading ? 'loading' : ''}`} onClick={run} disabled={loading}>
          {loading ? <><span className="spinner" />ANALYZING...</> : <>⚡ ANALYZE</>}
        </button>
        {analysis && (
          <div className="price-display">
            <span className="price">${analysis.current_price?.toFixed(2)}</span>
            <span className={analysis.price_change_1d_pct >= 0 ? 'positive' : 'negative'}>
              {analysis.price_change_1d_pct >= 0 ? '+' : ''}{analysis.price_change_1d_pct?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* ── Chart + Score Panel ── */}
      <div className="main-content">
        <TradingViewChart ticker={chartSymbol} timeframe={chartTf} />
        <div className="score-panel">
          <div className="section-title">SETUP QUALITY</div>
          {analysis ? (
            <>
              <div className="gauges-grid">
                <ScoreGauge score={analysis.scores.market_structure} label="STRUCTURE" />
                <ScoreGauge score={analysis.scores.liquidity} label="LIQUIDITY" />
                <ScoreGauge score={analysis.scores.risk} label="RISK" />
                <ScoreGauge score={analysis.scores.confluence} label="CONFLUENCE" />
              </div>
              <div className="overall-score">
                <span className={`overall-number ${gradeClass}`}>{analysis.scores.overall}</span>
                <span className={`overall-grade ${gradeClass}`}>{analysis.grade}</span>
              </div>
              <div className={`verdict-badge ${gradeClass}`}>{analysis.verdict}</div>
            </>
          ) : (
            <div className="placeholder">
              <div className="placeholder-icon">📊</div>
              <p>Enter a ticker symbol,<br />select a timeframe,<br />and click Analyze.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Analysis Cards ── */}
      {analysis && (
        <div className="analysis-grid">

          {/* Market Structure */}
          <div className="card">
            <div className="card-title">⬡ MARKET STRUCTURE</div>
            <div className="trend-row">
              <TrendBadge label="Long Term" trend={analysis.market_structure.long_term_trend} />
              <TrendBadge label="Medium Term" trend={analysis.market_structure.medium_term_trend} />
              <TrendBadge label="Short Term" trend={analysis.market_structure.short_term_trend} />
            </div>
            <div className="card-text">{analysis.market_structure.analysis}</div>
            {analysis.market_structure.key_patterns?.length > 0 && (
              <div className="tags">
                {analysis.market_structure.key_patterns.map((p, i) => <span key={i} className="tag">{p}</span>)}
              </div>
            )}
          </div>

          {/* Liquidity */}
          <div className="card">
            <div className="card-title">💧 LIQUIDITY ANALYSIS</div>
            <div className="liquidity-items">
              {analysis.liquidity_analysis.liquidity_pools?.map((p, i) => (
                <div key={i} className="liquidity-item"><span className="li-dot" style={{ background: '#06b6d4' }} />{p}</div>
              ))}
              {analysis.liquidity_analysis.stop_clusters?.map((c, i) => (
                <div key={i} className="liquidity-item"><span className="li-dot" style={{ background: '#f59e0b' }} />Stop cluster: {c}</div>
              ))}
              {analysis.liquidity_analysis.sweeps_detected?.map((s, i) => (
                <div key={i} className="liquidity-item"><span className="li-dot" style={{ background: '#8b5cf6' }} />Sweep: {s}</div>
              ))}
              {analysis.liquidity_analysis.trap_zones?.map((t, i) => (
                <div key={i} className="liquidity-item"><span className="li-dot" style={{ background: '#ef4444' }} />Trap: {t}</div>
              ))}
            </div>
            <div className="intent">{analysis.liquidity_analysis.institutional_intentions}</div>
          </div>

          {/* Supply & Demand */}
          <div className="card">
            <div className="card-title">⚡ SUPPLY & DEMAND</div>
            <div className="zones">
              <div className="zone-group">
                <div className="zone-label" style={{ color: '#ef4444' }}>SUPPLY ZONES</div>
                {analysis.supply_demand.supply_zones?.map((z, i) => <ZoneRow key={i} zone={z} type="supply" />)}
              </div>
              <div className="zone-group">
                <div className="zone-label" style={{ color: '#10b981' }}>DEMAND ZONES</div>
                {analysis.supply_demand.demand_zones?.map((z, i) => <ZoneRow key={i} zone={z} type="demand" />)}
              </div>
              {analysis.supply_demand.fair_value_gaps?.length > 0 && (
                <div className="zone-group">
                  <div className="zone-label" style={{ color: '#8b5cf6' }}>FAIR VALUE GAPS</div>
                  {analysis.supply_demand.fair_value_gaps.map((g, i) => (
                    <div key={i} className="zone-row" style={{ borderLeftColor: '#8b5cf6' }}>
                      <div className="zone-price">{g}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trade Setup */}
          <div className="card">
            <div className="card-title">🎯 TRADE SETUP</div>
            {analysis.trade_plan.valid_setup ? (
              <>
                <div>
                  <span className={`direction-badge ${analysis.trade_plan.direction?.toLowerCase()}`}>
                    {analysis.trade_plan.direction === 'Long' ? '▲ LONG' :
                     analysis.trade_plan.direction === 'Short' ? '▼ SHORT' : '— WAIT'}
                  </span>
                </div>
                <div className="trade-row">
                  <div className="trade-item">
                    <span>Entry Zone</span>
                    <strong>{analysis.trade_plan.entry_zone}</strong>
                  </div>
                  <div className="trade-item">
                    <span>Stop Loss</span>
                    <strong style={{ color: '#ef4444' }}>{analysis.trade_plan.stop_loss}</strong>
                  </div>
                  <div className="trade-item">
                    <span>Target 1</span>
                    <strong style={{ color: '#10b981' }}>{analysis.trade_plan.take_profit_1}</strong>
                  </div>
                  <div className="trade-item">
                    <span>Target 2</span>
                    <strong style={{ color: '#10b981' }}>{analysis.trade_plan.take_profit_2}</strong>
                  </div>
                  <div className="trade-item">
                    <span>R/R Ratio</span>
                    <strong style={{ color: '#06b6d4' }}>{analysis.trade_plan.rr_ratio}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="no-setup">
                {analysis.rejection_reason || 'No valid setup detected. Conditions do not meet minimum quality threshold.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scenarios ── */}
      {analysis && (
        <div className="scenarios-section">
          <div className="section-title">SCENARIO ANALYSIS</div>
          <div className="scenarios-grid">
            <ScenarioCard type="bullish" data={analysis.scenarios.bullish} />
            <ScenarioCard type="neutral" data={analysis.scenarios.neutral} />
            <ScenarioCard type="bearish" data={analysis.scenarios.bearish} />
          </div>
        </div>
      )}

      {/* ── Final Verdict ── */}
      {analysis && (
        <div className={`verdict-banner ${gradeClass}`}>
          <div className="verdict-content">
            <span className="verdict-label">FINAL VERDICT</span>
            <span className="verdict-text">{analysis.verdict}</span>
            <span className="confidence-badge">Confidence: {analysis.confidence}</span>
          </div>
        </div>
      )}
    </div>
  )
}
