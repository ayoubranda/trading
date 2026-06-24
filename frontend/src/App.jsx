import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { createChart, ColorType, LineStyle } from 'lightweight-charts'
import { searchAssets, TYPE_COLORS } from './assets'

const TV_INTERVALS = { '1m':'1','5m':'5','15m':'15','30m':'30','1h':'60','4h':'240','1d':'D','1w':'W' }

// ─── Score helpers ───────────────────────────────────────────
const to10     = (s) => (s / 10).toFixed(1)
const vLabel   = (s) => s>=90?'ELITE SETUP':s>=80?'STRONG SETUP':s>=70?'GOOD SETUP':s>=60?'WEAK SETUP':'NO VALID SETUP'
const vClass   = (s) => s>=90?'v-elite':s>=80?'v-strong':s>=70?'v-good':s>=60?'v-weak':'v-reject'
const takeTrade= (a) => a.trade_plan.valid_setup && a.scores.overall >= 70

// ─── Confluence Engine (pure computation, mirrors Python engine) ─
const WYCKOFF_BOOST = {
  ACCUMULATION_C: +8, ACCUMULATION_D: +5,
  DISTRIBUTION_C: +8, DISTRIBUTION_D: +5,
}
const WYCKOFF_REDUCE = {
  ACCUMULATION_A: -3, ACCUMULATION_B: -5,
  DISTRIBUTION_A: -3, DISTRIBUTION_B: -5,
  INDETERMINATE:  -5,
}

function computeConfluence(analysis, ew, news) {
  const W = { technical: 0.40, elliott: 0.35, news: 0.25 }
  const src = {}

  if (analysis) {
    const score = analysis.scores?.overall || 0
    const dir   = analysis.trade_plan?.direction
    const bias  = dir === 'Long' ? 'bullish' : dir === 'Short' ? 'bearish' : 'neutral'
    const rs    = []
    if (analysis.trade_plan?.valid_setup) rs.push(`${dir} trade setup confirmed`)
    ;(analysis.market_structure?.key_patterns || []).slice(0,2).forEach(p => rs.push(String(p)))
    if (analysis.market_structure?.analysis) rs.push(analysis.market_structure.analysis.slice(0,110))
    src.technical = { bias, score, reasons: rs.filter(Boolean).slice(0,5) }
  }
  if (ew) {
    let score  = ew.confidence?.score || 0
    const verdict = ew.elliott_verdict
    const dir  = ew.trade_recommendation?.direction
    let bias   = dir === 'Long' ? 'bullish' : dir === 'Short' ? 'bearish' : 'neutral'
    if (verdict === 'NO_TRADE') { bias = 'neutral'; score = Math.min(score, 30) }
    else if (verdict === 'WAIT') score = Math.min(score, 55)
    const rs = []
    if (ew.wave_count?.primary_label)   rs.push(ew.wave_count.primary_label)
    if (ew.wave_count?.current_position) rs.push(ew.wave_count.current_position.slice(0,110))
    if (ew.verdict_reason)              rs.push(ew.verdict_reason.slice(0,110))
    src.elliott = { bias, score, reasons: rs.filter(Boolean).slice(0,5) }
  }
  if (news) {
    const score    = news.confidence_score || 0
    const biasText = news.fundamental_bias || 'Neutral'
    let bias = biasText.includes('Bullish') ? 'bullish' : biasText.includes('Bearish') ? 'bearish' : 'neutral'
    if (news.suggested_action === 'NO POSITION') bias = 'neutral'
    src.news = { bias, score, reasons: (news.top_drivers || []).slice(0,3).filter(Boolean) }
  }

  if (!Object.keys(src).length) return null

  const totalW   = Object.keys(src).reduce((s,k) => s + W[k], 0)
  let   weighted = Object.keys(src).reduce((s,k) => s + src[k].score * W[k] / totalW, 0)

  // Wyckoff phase adjustment
  const wyckoffPhase = analysis?.market_structure?.wyckoff_phase || 'INDETERMINATE'
  const wyckoffContext = analysis?.market_structure?.wyckoff_context || ''
  const wyckoffDelta = WYCKOFF_BOOST[wyckoffPhase] ?? WYCKOFF_REDUCE[wyckoffPhase] ?? 0
  weighted = Math.max(0, Math.min(100, weighted + wyckoffDelta))

  // MTF alignment gate
  const mtfOk = analysis?.trade_plan?.mtf_alignment ?? analysis?.market_structure?.mtf_alignment ?? true
  if (!mtfOk) weighted = Math.max(0, weighted - 10)

  const bull = Object.values(src).filter(v => v.bias === 'bullish').length
  const bear = Object.values(src).filter(v => v.bias === 'bearish').length
  const n    = Object.keys(src).length
  const bias = bull > n/2 ? 'BUY' : bear > n/2 ? 'SELL' : 'NEUTRAL'

  const grade      = weighted>=90?'Elite Setup':weighted>=80?'A+':weighted>=70?'A':weighted>=60?'B':weighted>=50?'C':'Avoid'
  const confidence = weighted>=90?'Very High':weighted>=80?'High':weighted>=70?'Medium':weighted>=60?'Low':'Very Low'

  // Knowledge citations
  const citations = []
  if (wyckoffPhase && wyckoffPhase !== 'INDETERMINATE' && wyckoffContext)
    citations.push(`Wyckoff: ${wyckoffPhase} — ${wyckoffContext}`)
  if (['ACCUMULATION_C','DISTRIBUTION_C'].includes(wyckoffPhase))
    citations.push('ICT: Liquidity sweep aligns with Wyckoff Phase C — highest-confidence reversal')
  if (!mtfOk)
    citations.push('Risk: MTF misalignment detected — reduce position size')
  const pd = analysis?.liquidity_analysis?.premium_discount
  if (pd) citations.push(`ICT Premium/Discount: Price in ${pd} zone`)
  const ote = analysis?.liquidity_analysis?.ote_zone
  if (ote) citations.push(`ICT OTE (62–79% zone): ${ote}`)

  const allReasons = []
  if (wyckoffPhase && wyckoffPhase !== 'INDETERMINATE' && wyckoffContext)
    allReasons.push(`Wyckoff ${wyckoffPhase}: ${wyckoffContext}`)
  Object.values(src).forEach(s => allReasons.push(...s.reasons))

  const risks = []
  if (!mtfOk) risks.push('MTF misalignment: short-term direction conflicts with medium-term trend')
  if (ew?.alternative_counts?.[0]) risks.push(`Alt. Elliott count: ${ew.alternative_counts[0].label || ''}`)
  if (news?.risk_notes) risks.push(news.risk_notes.slice(0,110))
  if (analysis?.supply_demand?.supply_zones?.[0]) risks.push(`Supply zone at ${analysis.supply_demand.supply_zones[0].price_range}`)

  let tradePlan = {}
  if (analysis?.trade_plan?.valid_setup) {
    const tp = analysis.trade_plan
    tradePlan = { entry:tp.entry_zone, sl:tp.stop_loss, tp1:tp.take_profit_1, tp2:tp.take_profit_2, rr:tp.rr_ratio, direction:tp.direction, mtfOk }
  } else if (ew?.trade_recommendation?.action && !['NO_TRADE','WAIT'].includes(ew.trade_recommendation.action)) {
    const tr = ew.trade_recommendation
    tradePlan = { entry:tr.entry_zone, sl:tr.invalidation_level, tp1:tr.target_1, tp2:tr.target_2, rr:'—', direction:tr.direction, mtfOk }
  }

  return {
    score: Math.round(weighted * 10) / 10,
    grade, bias, confidence,
    wyckoffPhase, wyckoffDelta, mtfOk,
    citations: citations.slice(0, 4),
    whyThisTrade: allReasons.filter(Boolean).slice(0,5),
    risks:        risks.filter(Boolean).slice(0,3),
    tradePlan,
    sources: Object.fromEntries(Object.entries(src).map(([k,v]) => [k, { bias:v.bias, score: Math.round(v.score*10)/10 }])),
  }
}

// ─── Institutional Decision Card ─────────────────────────────
function InstitutionalDecisionCard({ analysis, ew, news, assetLabel, timeframe }) {
  const c = useMemo(() => computeConfluence(analysis, ew, news), [analysis, ew, news])
  if (!c) return null

  const biasColor  = c.bias==='BUY'?'#10b981':c.bias==='SELL'?'#ef4444':'#f59e0b'
  const gradeColor = c.score>=80?'#10b981':c.score>=60?'#f59e0b':'#ef4444'
  const dirLabel   = c.bias==='BUY'?'▲ BUY':c.bias==='SELL'?'▼ SELL':'— NEUTRAL'

  return (
    <div className="id-card">
      {/* Header */}
      <div className="id-header">
        <div className="id-header-left">
          <span className="id-icon">⬟</span>
          <div>
            <div className="id-title">INSTITUTIONAL DECISION ENGINE</div>
            <div className="id-subtitle">Confluencing Technical · Elliott Wave · Fundamental News</div>
          </div>
        </div>
        <div className="id-asset-pill">
          <span>{assetLabel}</span>
          <span className="id-tf-badge">{timeframe?.toUpperCase()}</span>
        </div>
      </div>

      {/* Score Row */}
      <div className="id-score-row">
        <div className="id-metric id-metric-main">
          <div className="id-metric-label">INST. SCORE</div>
          <div className="id-metric-big" style={{color:gradeColor}}>
            {c.score}<span className="id-metric-denom">/100</span>
          </div>
          <div className="id-score-bar-bg">
            <div className="id-score-bar-fill" style={{width:`${c.score}%`,background:gradeColor}}/>
          </div>
        </div>
        <div className="id-metric">
          <div className="id-metric-label">SETUP GRADE</div>
          <div className="id-grade" style={{color:gradeColor}}>{c.grade}</div>
        </div>
        <div className="id-metric">
          <div className="id-metric-label">BIAS</div>
          <div className="id-bias-pill" style={{background:biasColor+'20',color:biasColor,borderColor:biasColor+'50'}}>{dirLabel}</div>
        </div>
        <div className="id-metric">
          <div className="id-metric-label">CONFIDENCE</div>
          <div className="id-conf-label" style={{color:biasColor}}>{c.confidence}</div>
          <div className="id-conf-pct" style={{color:biasColor+'99'}}>{c.score}%</div>
        </div>
      </div>

      {/* Source Breakdown + Wyckoff/MTF row */}
      <div className="id-sources-section">
        <div className="id-sources-title">SIGNAL SOURCES</div>
        {['technical','elliott','news'].filter(k => c.sources[k]).map(k => {
          const s  = c.sources[k]
          const sc = s.score
          const sc_color = sc>=70?'#10b981':sc>=50?'#f59e0b':'#ef4444'
          const lbl = k==='technical'?'Technical Analysis':k==='elliott'?'Elliott Wave':'Fundamental News'
          const bColor = s.bias==='bullish'?'#10b981':s.bias==='bearish'?'#ef4444':'#f59e0b'
          return (
            <div key={k} className="id-source-row">
              <span className="id-source-label">{lbl}</span>
              <span className="id-source-bias" style={{color:bColor}}>
                {s.bias==='bullish'?'▲ Bullish':s.bias==='bearish'?'▼ Bearish':'— Neutral'}
              </span>
              <div className="id-source-bar-bg">
                <div className="id-source-bar-fill" style={{width:`${sc}%`,background:sc_color}}/>
              </div>
              <span className="id-source-pct" style={{color:sc_color}}>{sc}%</span>
            </div>
          )
        })}
        {Object.keys(c.sources).length < 3 && (
          <div className="id-incomplete-note">
            ⚠ Run {!c.sources.elliott?'Elliott Wave':''}{(!c.sources.elliott&&!c.sources.news)?' + ':''}{!c.sources.news?'News':''} Analysis for full confluence score
          </div>
        )}
        {/* Wyckoff + MTF tags */}
        <div className="id-tags-row">
          {c.wyckoffPhase && c.wyckoffPhase !== 'INDETERMINATE' && (
            <span className="id-tag id-tag-wyckoff">
              ⬡ Wyckoff: {c.wyckoffPhase.replace('_',' ')}
              {c.wyckoffDelta > 0 && <span className="id-tag-delta"> +{c.wyckoffDelta}pts</span>}
              {c.wyckoffDelta < 0 && <span className="id-tag-delta id-tag-delta-neg"> {c.wyckoffDelta}pts</span>}
            </span>
          )}
          <span className={`id-tag ${c.mtfOk ? 'id-tag-mtf-ok' : 'id-tag-mtf-fail'}`}>
            {c.mtfOk ? '✓ MTF Aligned' : '⚠ MTF Conflict'}
          </span>
        </div>
      </div>

      {/* Knowledge Citations */}
      {c.citations?.length > 0 && (
        <div className="id-citations">
          <div className="id-section-title">KNOWLEDGE CITATIONS</div>
          {c.citations.map((cit,i) => (
            <div key={i} className="id-citation-row">
              <span className="id-cite-icon">⬟</span><span>{cit}</span>
            </div>
          ))}
        </div>
      )}

      {/* Why + Risks */}
      <div className="id-lower">
        <div className="id-why">
          <div className="id-section-title">WHY THIS TRADE</div>
          {c.whyThisTrade.length ? c.whyThisTrade.map((r,i)=>(
            <div key={i} className="id-reason"><span className="id-check">✓</span><span>{r}</span></div>
          )) : <div className="id-empty">Run analysis to generate reasons</div>}
        </div>
        <div className="id-risks-col">
          <div className="id-section-title">RISK FACTORS</div>
          {c.risks.length ? c.risks.map((r,i)=>(
            <div key={i} className="id-risk"><span className="id-warn">⚠</span><span>{r}</span></div>
          )) : <div className="id-no-risk">No major risks identified</div>}
        </div>
      </div>

      {/* Trade Plan */}
      {c.tradePlan?.entry && (
        <div className="id-trade-plan">
          <div className="id-section-title">FINAL TRADE PLAN</div>
          <div className="id-plan-grid">
            <div className="id-plan-item"><span>Entry</span><strong>{c.tradePlan.entry}</strong></div>
            <div className="id-plan-item"><span>Stop Loss</span><strong style={{color:'#ef4444'}}>{c.tradePlan.sl}</strong></div>
            <div className="id-plan-item"><span>Target 1</span><strong style={{color:'#10b981'}}>{c.tradePlan.tp1}</strong></div>
            <div className="id-plan-item"><span>Target 2</span><strong style={{color:'#10b981'}}>{c.tradePlan.tp2}</strong></div>
            <div className="id-plan-item"><span>R/R Ratio</span><strong style={{color:'#06b6d4'}}>{c.tradePlan.rr}</strong></div>
            <div className="id-plan-item"><span>Direction</span>
              <strong style={{color:c.tradePlan.direction==='Long'?'#10b981':c.tradePlan.direction==='Short'?'#ef4444':'#f59e0b'}}>
                {c.tradePlan.direction==='Long'?'▲ LONG':c.tradePlan.direction==='Short'?'▼ SHORT':'— NEUTRAL'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI Trade Visualizer ──────────────────────────────────────
const parsePrice = (str) => {
  if (!str || str === '—') return null
  const clean = String(str).replace(/[$,\s]/g,'')
  const nums  = clean.match(/\d+\.?\d*/g)
  if (!nums?.length) return null
  return nums.length >= 2 ? (parseFloat(nums[0]) + parseFloat(nums[1])) / 2 : parseFloat(nums[0])
}

const toChartTime = (dateStr) => {
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000)
}

function AITradeVisualizer({ analysis, ew, news, yfTicker, ticker, timeframe }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const [candles,  setCandles]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [expanded, setExpanded] = useState(true)

  // Fetch candles when technical analysis becomes available
  useEffect(() => {
    if (!analysis) return
    const sym = yfTicker || ticker
    if (!sym) return
    setLoading(true); setError(null)
    fetch(`/candles?ticker=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(timeframe)}`)
      .then(r => r.text())
      .then(text => {
        if (!text) throw new Error('No candle data returned')
        const d = JSON.parse(text)
        if (d.detail) throw new Error(d.detail)
        setCandles(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [analysis, yfTicker, ticker, timeframe])

  // Build / rebuild chart whenever data changes
  useEffect(() => {
    if (!containerRef.current || !candles?.candles?.length) return
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }

    let obs = null
    try {
      const chart = createChart(containerRef.current, {
        layout:  { background: { type: ColorType.Solid, color: '#0a0a16' }, textColor: '#94a3b8' },
        grid:    { vertLines: { color: 'rgba(30,30,53,.35)' }, horzLines: { color: 'rgba(30,30,53,.35)' } },
        crosshair: { mode: 1 },
        rightPriceScale: { borderColor: '#1e1e35' },
        timeScale: { borderColor: '#1e1e35', timeVisible: true, secondsVisible: false },
        width:  containerRef.current.clientWidth || 600,
        height: 420,
      })
      chartRef.current = chart

      const cs = chart.addCandlestickSeries({
        upColor:'#10b981', downColor:'#ef4444',
        borderUpColor:'#10b981', borderDownColor:'#ef4444',
        wickUpColor:'#10b981', wickDownColor:'#ef4444',
      })

      // Deduplicate by timestamp (keep last), then sort ascending — required by lightweight-charts
      const seen = new Map()
      candles.candles.forEach(c => {
        const t = toChartTime(c.date)
        if (t !== null) seen.set(t, { time:t, open:+c.open, high:+c.high, low:+c.low, close:+c.close })
      })
      const data = [...seen.values()].sort((a,b) => a.time - b.time)
      if (!data.length) return

      cs.setData(data)

      // Trade levels from technical analysis
      if (analysis?.trade_plan?.valid_setup) {
        const tp = analysis.trade_plan
        const levels = [
          { price:parsePrice(tp.entry_zone),    color:'#06b6d4', title:'ENTRY',    style:LineStyle.Solid,  w:2 },
          { price:parsePrice(tp.stop_loss),     color:'#ef4444', title:'SL',       style:LineStyle.Dashed, w:1 },
          { price:parsePrice(tp.take_profit_1), color:'#10b981', title:'TP1',      style:LineStyle.Dashed, w:1 },
          { price:parsePrice(tp.take_profit_2), color:'#059669', title:'TP2',      style:LineStyle.Dashed, w:1 },
        ]
        levels.forEach(({ price, color, title, style, w }) => {
          if (price) cs.createPriceLine({ price, color, lineWidth:w, lineStyle:style, title })
        })
      }

      // Elliott fibonacci key levels
      if (ew?.fibonacci_levels) {
        const fib = ew.fibonacci_levels
        ;[
          { val:parsePrice(fib.key_support),    title:'EW Support' },
          { val:parsePrice(fib.key_resistance), title:'EW Resist'  },
        ].forEach(({ val, title }) => {
          if (val) cs.createPriceLine({ price:val, color:'#8b5cf6', lineWidth:1, lineStyle:LineStyle.Dotted, title })
        })
      }

      // Supply / demand zones (rgba instead of 8-digit hex for broad compatibility)
      const supply = analysis?.supply_demand?.supply_zones?.[0]
      const demand = analysis?.supply_demand?.demand_zones?.[0]
      if (supply) { const p=parsePrice(supply.price_range); if(p) cs.createPriceLine({ price:p, color:'rgba(239,68,68,0.5)', lineWidth:1, lineStyle:LineStyle.Dashed, title:`Supply: ${supply.price_range}` }) }
      if (demand) { const p=parsePrice(demand.price_range); if(p) cs.createPriceLine({ price:p, color:'rgba(16,185,129,0.5)', lineWidth:1, lineStyle:LineStyle.Dashed, title:`Demand: ${demand.price_range}` }) }

      // Swing high/low markers
      if (data.length) {
        const markers = []
        ;(candles.swing_highs || []).slice(-4).forEach(price => {
          const nearest = data.reduce((best,c) => Math.abs(c.high-price) < Math.abs(best.high-price) ? c : best, data[0])
          if (nearest) markers.push({ time:nearest.time, position:'aboveBar', color:'#ef4444', shape:'arrowDown', text:'HH' })
        })
        ;(candles.swing_lows || []).slice(-4).forEach(price => {
          const nearest = data.reduce((best,c) => Math.abs(c.low-price) < Math.abs(best.low-price) ? c : best, data[0])
          if (nearest) markers.push({ time:nearest.time, position:'belowBar', color:'#10b981', shape:'arrowUp', text:'HL' })
        })
        if (markers.length) {
          const unique = [...new Map(markers.map(m=>[m.time,m])).values()].sort((a,b)=>a.time-b.time)
          cs.setMarkers(unique)
        }
      }

      chart.timeScale().fitContent()

      obs = new ResizeObserver(() => {
        if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
      })
      obs.observe(containerRef.current)
    } catch(e) {
      console.error('Chart build error:', e)
      setError(`Chart error: ${e.message}`)
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }

    return () => {
      if (obs) obs.disconnect()
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [candles, analysis, ew])

  // AI explanation sections (derived from existing data, no extra API call)
  const explanations = useMemo(() => {
    const ex = []
    if (analysis?.market_structure?.analysis)
      ex.push({ n:'1. Market Structure', t: analysis.market_structure.analysis })
    if (ew?.wave_count?.current_position)
      ex.push({ n:'2. Elliott Wave', t: `${ew.wave_count.current_position}. ${ew.verdict_reason||''}` })
    if (analysis?.trade_plan?.valid_setup)
      ex.push({ n:'3. Technical Confirmation', t: `${analysis.trade_plan.direction} setup. Entry: ${analysis.trade_plan.entry_zone}. R/R: ${analysis.trade_plan.rr_ratio}. Stop below ${analysis.trade_plan.stop_loss}.` })
    if (news?.institutional_outlook)
      ex.push({ n:'4. News Confirmation', t: news.institutional_outlook })
    const inv = ew?.trade_recommendation?.invalidation_level || analysis?.scenarios?.bearish?.invalidation
    if (inv) ex.push({ n:'5. Risk Assessment', t: `Wave count invalidated if price crosses ${inv}. ${analysis?.rejection_reason||'Monitor for structural break.'}` })
    return ex
  }, [analysis, ew, news])

  if (!analysis) return null

  return (
    <div className="viz-widget">
      <div className="viz-header" onClick={()=>setExpanded(!expanded)}>
        <div className="viz-header-left">
          <span className="viz-icon">📈</span>
          <div>
            <div className="viz-title">AI Trade Visualizer</div>
            <div className="viz-sub">Elliott Wave · Market Structure · Trade Levels · Supply &amp; Demand</div>
          </div>
        </div>
        <span className="viz-toggle">{expanded?'▲':'▼'}</span>
      </div>

      {expanded && (
        <div className="viz-body">
          {loading && <div className="viz-status"><span className="spinner"/> Loading chart data...</div>}
          {error   && <div className="viz-error">⚠ {error}</div>}

          {!loading && !error && candles && (
            <>
              <div className="viz-legend">
                {[['#06b6d4','Entry'],['#ef4444','Stop Loss'],['#10b981','TP1'],['#059669','TP2'],['#8b5cf6','EW Levels'],['#ef4444','Supply','0.5'],['#10b981','Demand','0.5']].map(([c,l,o],i)=>(
                  <span key={i} className="viz-leg-item" style={{color:c,opacity:o||1}}>— {l}</span>
                ))}
                <span className="viz-leg-item" style={{color:'#ef4444'}}>▼ HH</span>
                <span className="viz-leg-item" style={{color:'#10b981'}}>▲ HL</span>
              </div>
              <div ref={containerRef} className="viz-chart"/>
            </>
          )}

          {explanations.length > 0 && (
            <div className="viz-explain">
              <div className="viz-explain-title">Why The AI Chose This Trade</div>
              <div className="viz-explain-grid">
                {explanations.map((e,i) => (
                  <div key={i} className="viz-explain-item">
                    <div className="viz-explain-section">{e.n}</div>
                    <div className="viz-explain-text">{e.t}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Score Gauge (0–10) ──────────────────────────────────────
function ScoreGauge({ score100, label }) {
  const r=36,cx=50,cy=56
  const polar=(a)=>{ const rad=(a-90)*Math.PI/180; return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)} }
  const arc=(s,e)=>{ const p1=polar(s),p2=polar(e); return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${e-s>180?1:0} 1 ${p2.x} ${p2.y}` }
  const color = score100>=80?'#10b981':score100>=60?'#f59e0b':'#ef4444'
  return (
    <div className="gauge-container">
      <svg width="100" height="76" viewBox="0 0 100 76">
        <path d={arc(135,405)} fill="none" stroke="#1e1e35" strokeWidth="8" strokeLinecap="round"/>
        {score100>0&&<path d={arc(135,135+(score100/100)*270)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"/>}
        <text x="50" y="50" textAnchor="middle" fill={color} fontSize="15" fontWeight="700" fontFamily="JetBrains Mono,monospace">{to10(score100)}</text>
        <text x="50" y="63" textAnchor="middle" fill={color} fontSize="8" fontFamily="JetBrains Mono,monospace">/10</text>
      </svg>
      <div className="gauge-label">{label}</div>
    </div>
  )
}

// ─── Scenario Card ───────────────────────────────────────────
function ScenarioCard({ type, data }) {
  const cfg={bullish:{color:'#10b981',icon:'▲'},bearish:{color:'#ef4444',icon:'▼'},neutral:{color:'#f59e0b',icon:'◆'}}
  const {color,icon}=cfg[type]
  return (
    <div className="scenario-card" style={{borderLeftColor:color}}>
      <div className="scenario-header" style={{color}}>
        <span>{icon}</span><span>{type.toUpperCase()} SCENARIO</span>
        <span className="probability" style={{background:color}}>{data.probability}%</span>
      </div>
      <div className="scenario-body">
        <div><span>Trigger:</span>{data.trigger}</div>
        <div><span>Target:</span>{data.target}</div>
        <div><span>Invalidation:</span>{data.invalidation}</div>
      </div>
      <div className="probability-bar"><div className="probability-fill" style={{width:`${data.probability}%`,background:color}}/></div>
    </div>
  )
}

// ─── TradingView Chart ───────────────────────────────────────
function TradingViewChart({ tvSymbol, timeframe }) {
  const ref=useRef(null)
  useEffect(()=>{
    if(!ref.current) return
    ref.current.innerHTML=''
    const s=document.createElement('script')
    s.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    s.async=true
    s.innerHTML=JSON.stringify({
      autosize:true, symbol:tvSymbol||'NASDAQ:NVDA',
      interval:TV_INTERVALS[timeframe]||'D',
      timezone:'Etc/UTC', theme:'dark', style:'1', locale:'en',
      backgroundColor:'rgba(8,8,16,1)', gridColor:'rgba(30,30,53,0.5)',
      hide_top_toolbar:false, hide_legend:false, save_image:false,
      support_host:'https://www.tradingview.com',
    })
    ref.current.appendChild(s)
    return()=>{ if(ref.current) ref.current.innerHTML='' }
  },[tvSymbol,timeframe])
  return <div className="tradingview-container"><div ref={ref} style={{height:'100%',width:'100%'}}/></div>
}

// ─── Asset Autocomplete Input ────────────────────────────────
function AssetInput({ value, onChange, onSelect }) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const wrapRef = useRef(null)

  const handleChange = (v) => {
    onChange(v)
    const results = searchAssets(v)
    setSuggestions(results)
    setOpen(results.length > 0)
  }

  const handleSelect = (asset) => {
    onChange(asset.label)
    onSelect(asset)
    setOpen(false)
  }

  useEffect(() => {
    const handler = (e) => { if(wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="asset-wrap" ref={wrapRef}>
      <input
        className="ticker-input"
        type="text"
        value={value}
        placeholder="NVDA, EUR/USD, Gold..."
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if(suggestions.length>0) setOpen(true) }}
        onKeyDown={e => {
          if(e.key==='Escape') setOpen(false)
          if(e.key==='Enter' && suggestions.length===0) setOpen(false)
        }}
        autoComplete="off"
      />
      {open && (
        <div className="suggestions-dropdown">
          {suggestions.map((a,i) => (
            <div key={i} className="suggestion-item" onMouseDown={()=>handleSelect(a)}>
              <div className="suggestion-left">
                <span className="suggestion-label">{a.label}</span>
                <span className="suggestion-symbol">{a.symbol}</span>
              </div>
              <span className="suggestion-type" style={{color:TYPE_COLORS[a.type],borderColor:TYPE_COLORS[a.type]+'40'}}>
                {a.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Trend Badge ─────────────────────────────────────────────
function TrendBadge({label,trend}) {
  const color=trend==='Bullish'?'#10b981':trend==='Bearish'?'#ef4444':'#f59e0b'
  return (
    <div className="trend-badge">
      <span style={{color:'#475569',fontSize:'11px'}}>{label}</span>
      <span style={{color,fontWeight:700,fontSize:'13px',fontFamily:'JetBrains Mono,monospace'}}>{trend}</span>
    </div>
  )
}

// ─── Zone Row ─────────────────────────────────────────────────
function ZoneRow({zone,type}) {
  const color=type==='supply'?'#ef4444':'#10b981'
  const opacity=zone.strength==='Strong'?1:zone.strength==='Moderate'?0.75:0.45
  return (
    <div className="zone-row" style={{borderLeftColor:color,opacity}}>
      <div className="zone-price">{zone.price_range}</div>
      <div className="zone-strength">{zone.strength}</div>
      {zone.notes&&<div className="zone-notes">{zone.notes}</div>}
    </div>
  )
}

// ─── Final Decision Widget ───────────────────────────────────
function FinalDecision({ analysis, onDownload }) {
  const take    = takeTrade(analysis)
  const score10 = to10(analysis.scores.overall)
  const dir     = analysis.trade_plan.direction

  return (
    <div className={`final-decision ${take?'fd-take':'fd-avoid'}`}>
      <div className="fd-left">
        <div className="fd-verdict-label">FINAL DECISION</div>
        <div className="fd-verdict-text">
          {take ? '✓  TAKE TRADE' : '✗  STAND ASIDE'}
        </div>
        <div className="fd-meta">
          <span className={`fd-direction ${dir==='Long'?'dir-long':dir==='Short'?'dir-short':'dir-none'}`}>
            {dir==='Long'?'▲ LONG':dir==='Short'?'▼ SHORT':'— NO POSITION'}
          </span>
          <span className="fd-confidence">Confidence: {analysis.confidence}</span>
        </div>
      </div>

      <div className="fd-levels">
        {analysis.trade_plan.valid_setup && <>
          <div className="fd-level"><span>Entry</span><strong>{analysis.trade_plan.entry_zone}</strong></div>
          <div className="fd-level"><span>Stop Loss</span><strong style={{color:'#ef4444'}}>{analysis.trade_plan.stop_loss}</strong></div>
          <div className="fd-level"><span>Target 1</span><strong style={{color:'#10b981'}}>{analysis.trade_plan.take_profit_1}</strong></div>
          <div className="fd-level"><span>Target 2</span><strong style={{color:'#10b981'}}>{analysis.trade_plan.take_profit_2}</strong></div>
          <div className="fd-level"><span>R/R</span><strong style={{color:'#06b6d4'}}>{analysis.trade_plan.rr_ratio}</strong></div>
        </>}
        {!analysis.trade_plan.valid_setup&&(
          <div className="fd-reject-reason">{analysis.rejection_reason||'Setup quality below minimum threshold.'}</div>
        )}
      </div>

      <div className="fd-right">
        <div className="fd-score-big">{score10}</div>
        <div className="fd-score-label">/ 10</div>
        <div className={`fd-score-tag ${vClass(analysis.scores.overall)}`}>{vLabel(analysis.scores.overall)}</div>
        <button className="pdf-btn" onClick={onDownload}>⬇ Download PDF</button>
      </div>
    </div>
  )
}

// ─── PDF Generator ───────────────────────────────────────────
function generatePDF(analysis, assetLabel, timeframe) {
  const doc   = new jsPDF({ unit:'mm', format:'a4' })
  const W     = 210, M = 15, CW = W - M*2
  const now   = new Date().toLocaleString('en-US',{dateStyle:'long',timeStyle:'short'})
  let y       = 0

  const clamp = (text, max=90) => text?.length>max ? text.slice(0,max)+'…' : (text||'')

  const addPage = () => { doc.addPage(); y=20 }

  const checkY = (needed=20) => { if(y+needed > 270) addPage() }

  const section = (title, color=[6,182,212]) => {
    checkY(14)
    doc.setFillColor(22,22,38)
    doc.rect(M,y,CW,8,'F')
    doc.setTextColor(...color)
    doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text(title, M+3, y+5.5)
    y+=12
  }

  const row = (label, value, valColor=[200,200,220]) => {
    checkY(8)
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text(label, M+3, y)
    doc.setTextColor(...valColor); doc.setFontSize(8)
    doc.text(String(value||'—'), M+55, y)
    y+=6
  }

  const para = (text, color=[180,190,210]) => {
    if(!text) return
    doc.setTextColor(...color); doc.setFontSize(8); doc.setFont('helvetica','normal')
    const lines = doc.splitTextToSize(text, CW-6)
    checkY(lines.length*5+3)
    doc.text(lines, M+3, y)
    y += lines.length*5+3
  }

  const bullet = (items=[], dotColor=[6,182,212]) => {
    items.forEach(item => {
      if(!item) return
      checkY(6)
      doc.setFillColor(...dotColor); doc.circle(M+5,y-1.5,1,'F')
      doc.setTextColor(180,190,210); doc.setFontSize(8); doc.setFont('helvetica','normal')
      const lines=doc.splitTextToSize(String(item),CW-14)
      doc.text(lines,M+9,y)
      y+=lines.length*5+1
    })
  }

  // ── Cover header ──────────────────────────────────────────
  doc.setFillColor(8,8,16)
  doc.rect(0,0,W,45,'F')
  doc.setFillColor(6,182,212)
  doc.rect(0,0,W,1,'F')

  doc.setTextColor(6,182,212); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('ELITE TRADING INTELLIGENCE', M, 18)
  doc.setTextColor(139,92,246); doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text('Institutional-Grade Market Analysis Report', M, 26)
  doc.setTextColor(100,116,139); doc.setFontSize(8)
  doc.text(`Generated: ${now}`, W-M, 26, {align:'right'})

  // Asset bar
  doc.setFillColor(22,22,38)
  doc.rect(0,32,W,13,'F')
  doc.setTextColor(6,182,212); doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text(assetLabel, M, 41)
  doc.setTextColor(200,200,220); doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(`${analysis.company_name||''}  ·  Timeframe: ${timeframe.toUpperCase()}  ·  Price: ${analysis.current_price}`, M+35, 41)

  y=54

  // ── Market Structure ──────────────────────────────────────
  section('MARKET STRUCTURE')
  row('Long-Term Trend',  analysis.market_structure?.long_term_trend)
  row('Medium-Term Trend',analysis.market_structure?.medium_term_trend)
  row('Short-Term Trend', analysis.market_structure?.short_term_trend)
  row('Structure Type',   analysis.market_structure?.structure_type)
  y+=2; para(analysis.market_structure?.analysis)
  if(analysis.market_structure?.key_patterns?.length){
    y+=2
    doc.setTextColor(139,92,246); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Patterns:', M+3, y); y+=5
    bullet(analysis.market_structure.key_patterns, [139,92,246])
  }

  // ── Liquidity ─────────────────────────────────────────────
  section('LIQUIDITY ANALYSIS')
  if(analysis.liquidity_analysis?.liquidity_pools?.length){
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Liquidity Pools:', M+3, y); y+=5
    bullet(analysis.liquidity_analysis.liquidity_pools, [6,182,212])
  }
  if(analysis.liquidity_analysis?.stop_clusters?.length){
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Stop Clusters:', M+3, y); y+=5
    bullet(analysis.liquidity_analysis.stop_clusters, [245,158,11])
  }
  if(analysis.liquidity_analysis?.sweeps_detected?.length){
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Sweeps Detected:', M+3, y); y+=5
    bullet(analysis.liquidity_analysis.sweeps_detected, [139,92,246])
  }
  y+=2; para(analysis.liquidity_analysis?.institutional_intentions)

  // ── Supply & Demand ───────────────────────────────────────
  section('SUPPLY & DEMAND ZONES')
  if(analysis.supply_demand?.supply_zones?.length){
    doc.setTextColor(239,68,68); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Supply Zones:', M+3, y); y+=5
    analysis.supply_demand.supply_zones.forEach(z=>{
      checkY(7)
      doc.setTextColor(200,200,220); doc.setFontSize(8); doc.setFont('helvetica','normal')
      doc.text(`${z.price_range}  [${z.strength}]  ${clamp(z.notes,60)}`, M+9, y); y+=5
    })
  }
  y+=2
  if(analysis.supply_demand?.demand_zones?.length){
    doc.setTextColor(16,185,129); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Demand Zones:', M+3, y); y+=5
    analysis.supply_demand.demand_zones.forEach(z=>{
      checkY(7)
      doc.setTextColor(200,200,220); doc.setFontSize(8); doc.setFont('helvetica','normal')
      doc.text(`${z.price_range}  [${z.strength}]  ${clamp(z.notes,60)}`, M+9, y); y+=5
    })
  }
  if(analysis.supply_demand?.fair_value_gaps?.length){
    y+=2
    doc.setTextColor(139,92,246); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Fair Value Gaps:', M+3, y); y+=5
    bullet(analysis.supply_demand.fair_value_gaps,[139,92,246])
  }

  // ── Trade Setup ───────────────────────────────────────────
  section('TRADE SETUP')
  if(analysis.trade_plan?.valid_setup){
    row('Direction', analysis.trade_plan.direction, analysis.trade_plan.direction==='Long'?[16,185,129]:[239,68,68])
    row('Entry Zone',   analysis.trade_plan.entry_zone)
    row('Stop Loss',    analysis.trade_plan.stop_loss,    [239,68,68])
    row('Take Profit 1',analysis.trade_plan.take_profit_1,[16,185,129])
    row('Take Profit 2',analysis.trade_plan.take_profit_2,[16,185,129])
    row('R/R Ratio',    analysis.trade_plan.rr_ratio,     [6,182,212])
  } else {
    para(analysis.rejection_reason||'No valid trade setup detected.')
  }

  // ── Scenarios ─────────────────────────────────────────────
  section('SCENARIO ANALYSIS')
  const scenarios=[
    ['BULLISH',[16,185,129],analysis.scenarios?.bullish],
    ['NEUTRAL',[245,158,11],analysis.scenarios?.neutral],
    ['BEARISH',[239,68,68], analysis.scenarios?.bearish],
  ]
  scenarios.forEach(([name,color,s])=>{
    if(!s) return
    checkY(28)
    doc.setFillColor(22,22,38); doc.rect(M,y,CW,24,'F')
    doc.setFillColor(...color); doc.rect(M,y,2,24,'F')
    doc.setTextColor(...color); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text(`${name} (${s.probability}%)`, M+6, y+6)
    doc.setTextColor(180,190,210); doc.setFont('helvetica','normal')
    doc.text(`Trigger: ${clamp(s.trigger,80)}`, M+6, y+12)
    doc.text(`Target: ${clamp(s.target,80)}`,   M+6, y+17)
    doc.text(`Invalidation: ${clamp(s.invalidation,70)}`, M+6, y+22)
    y+=27
  })

  // ── Scores ────────────────────────────────────────────────
  section('SETUP SCORES (0–10)')
  const scores=[
    ['Market Structure', analysis.scores?.market_structure],
    ['Liquidity',        analysis.scores?.liquidity],
    ['Risk',             analysis.scores?.risk],
    ['Confluence',       analysis.scores?.confluence],
  ]
  scores.forEach(([name,s])=>{
    checkY(8)
    const sc=s||0
    const color=sc>=80?[16,185,129]:sc>=60?[245,158,11]:[239,68,68]
    doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','normal')
    doc.text(name, M+3, y)
    doc.setTextColor(...color); doc.setFont('helvetica','bold')
    doc.text(`${to10(sc)} / 10`, M+55, y)
    doc.setFillColor(22,22,38); doc.rect(M+80,y-3.5,80,4,'F')
    doc.setFillColor(...color); doc.rect(M+80,y-3.5,sc*0.8,4,'F')
    y+=7
  })

  // ── Final Decision ────────────────────────────────────────
  checkY(30)
  const take=takeTrade(analysis)
  const fc=take?[16,185,129]:[239,68,68]
  doc.setFillColor(take?8:20, take?20:8, take?14:14)
  doc.rect(M,y,CW,28,'F')
  doc.setFillColor(...fc); doc.rect(M,y,3,28,'F')

  doc.setTextColor(100,116,139); doc.setFontSize(8); doc.setFont('helvetica','normal')
  doc.text('FINAL DECISION', M+7, y+7)
  doc.setTextColor(...fc); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text(take?'✓  TAKE TRADE':'✗  STAND ASIDE', M+7, y+17)
  doc.setFontSize(10)
  doc.text(`${analysis.trade_plan.direction==='Long'?'▲ LONG':analysis.trade_plan.direction==='Short'?'▼ SHORT':'— NO POSITION'}    ${to10(analysis.scores?.overall||0)} / 10    Confidence: ${analysis.confidence}`, M+7, y+24)

  // Footer
  const pages = doc.getNumberOfPages()
  for(let i=1;i<=pages;i++){
    doc.setPage(i)
    doc.setFillColor(8,8,16); doc.rect(0,285,W,12,'F')
    doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text('Elite Trading Intelligence  ·  This report is for informational purposes only. Not financial advice.', M, 291)
    doc.text(`Page ${i} / ${pages}`, W-M, 291, {align:'right'})
  }

  const fname = `ETI_${(assetLabel||'analysis').replace(/[^a-zA-Z0-9]/g,'_')}_${timeframe}_${Date.now()}.pdf`
  doc.save(fname)
}

// ─── Fundamental News Widget ─────────────────────────────────
function FundamentalNewsWidget({ assetName, apiKey, model, analysis, onResult }) {
  const [loading,       setLoading]       = useState(false)
  const [news,          setNews]          = useState(null)
  const [error,         setError]         = useState(null)
  const [expanded,      setExpanded]      = useState(true)
  const [openItems,     setOpenItems]     = useState(new Set())

  const techBias = analysis?.market_structure?.long_term_trend || null

  const run = async () => {
    if (!apiKey) return setError('API key required')
    setLoading(true); setError(null)
    try {
      const res = await fetch('/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_name: assetName, api_key: apiKey, model, technical_bias: techBias }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response. Try again.')
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Server error (${res.status}): ${text.slice(0,300)}`) }
      if (!res.ok) throw new Error(data.detail || `News analysis failed (${res.status})`)
      setNews(data)
      if (onResult) onResult(data)
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (i) => {
    const s = new Set(openItems)
    s.has(i) ? s.delete(i) : s.add(i)
    setOpenItems(s)
  }

  const biasColor = (b) => {
    if (!b) return '#475569'
    if (b.includes('Strong Bullish')) return '#10b981'
    if (b.includes('Bullish'))        return '#34d399'
    if (b.includes('Strong Bearish')) return '#ef4444'
    if (b.includes('Bearish'))        return '#f87171'
    return '#f59e0b'
  }

  const impactColor  = (s) => s >= 7 ? '#ef4444' : s >= 4 ? '#f59e0b' : '#475569'
  const assetColor   = (a) => a === 'Bullish' ? '#10b981' : a === 'Bearish' ? '#ef4444' : '#f59e0b'
  const actionColor  = (a) => a === 'LONG' ? '#10b981' : a === 'SHORT' ? '#ef4444' : '#f59e0b'

  const getCombined = () => {
    if (!news) return null
    const fb = news.fundamental_bias
    if (!techBias) return { bias: fb, agreement: null, conf: news.confidence_score }
    const bull = (b) => b?.includes('Bullish')
    const bear = (b) => b?.includes('Bearish')
    let bias, agreement, boost = 0
    if (bull(fb) && techBias === 'Bullish')  { bias = 'Strong Bullish'; agreement = true;  boost = 10 }
    else if (bear(fb) && techBias === 'Bearish') { bias = 'Strong Bearish'; agreement = true;  boost = 10 }
    else if ((bull(fb) && techBias === 'Bearish') || (bear(fb) && techBias === 'Bullish')) {
      bias = 'Neutral'; agreement = false; boost = -15
    } else { bias = fb; agreement = null }
    return { bias, agreement, conf: Math.min(100, Math.max(0, news.confidence_score + boost)) }
  }

  const combined = getCombined()
  const ac = news ? actionColor(news.suggested_action) : '#475569'

  return (
    <div className="fn-widget">
      {/* ── Header ── */}
      <div className="fn-header" onClick={() => setExpanded(!expanded)}>
        <div className="fn-header-left">
          <span className="fn-logo">📰</span>
          <div>
            <div className="fn-title">Fundamental News Intelligence</div>
            <div className="fn-subtitle">Reuters · Kitco · Forex Factory · Federal Reserve · ECB</div>
          </div>
        </div>
        <div className="fn-header-right">
          {news && (
            <span className="fn-verdict-pill" style={{ background: ac+'20', color: ac, borderColor: ac+'50' }}>
              {news.suggested_action}
            </span>
          )}
          <button className="fn-run-btn" onClick={e=>{ e.stopPropagation(); run() }} disabled={loading}>
            {loading ? <><span className="spinner"/>Fetching News...</> : '⟳ Run News Analysis'}
          </button>
          <span className="fn-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {error && <div className="fn-error">⚠ {error}</div>}

      {/* ── Body ── */}
      {expanded && news && (
        <div className="fn-body">

          {/* Bias Cards */}
          <div className="fn-bias-row">
            {techBias && (
              <div className="fn-bias-card">
                <div className="fn-bias-label">TECHNICAL BIAS</div>
                <div className="fn-bias-value" style={{color:biasColor(techBias)}}>{techBias}</div>
                <div className="fn-bias-sub">From Chart Analysis</div>
              </div>
            )}
            <div className="fn-bias-card fn-bias-main">
              <div className="fn-bias-label">FUNDAMENTAL BIAS</div>
              <div className="fn-bias-value" style={{color:biasColor(news.fundamental_bias)}}>{news.fundamental_bias}</div>
              <div className="fn-bias-sub">From News Analysis</div>
            </div>
            {combined && (
              <div className={`fn-bias-card ${combined.agreement===true?'fn-agree':combined.agreement===false?'fn-conflict':''}`}>
                <div className="fn-bias-label">COMBINED BIAS</div>
                <div className="fn-bias-value" style={{color:biasColor(combined.bias)}}>{combined.bias}</div>
                {combined.agreement===false && <div className="fn-conflict-warn">⚠ Technical &amp; Fundamental Conflict</div>}
                {combined.agreement===true  && <div className="fn-agree-note">✓ Signals Aligned — Higher Confidence</div>}
              </div>
            )}
            <div className="fn-bias-card">
              <div className="fn-bias-label">SUGGESTED ACTION</div>
              <div className="fn-action-value" style={{color:ac}}>
                {news.suggested_action==='LONG'?'▲ LONG':news.suggested_action==='SHORT'?'▼ SHORT':'— NO POSITION'}
              </div>
              <div className="fn-conf-score" style={{color:ac}}>
                Confidence: {combined?.conf ?? news.confidence_score}%
              </div>
            </div>
          </div>

          {/* Top Drivers */}
          {news.top_drivers?.length > 0 && (
            <div className="fn-card">
              <div className="fn-card-title">🏆 TOP NEWS DRIVERS</div>
              <div className="fn-drivers-list">
                {news.top_drivers.map((d,i) => (
                  <div key={i} className="fn-driver">
                    <span className="fn-driver-num">{i+1}</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News Feed */}
          {news.news_items?.length > 0 && (
            <div className="fn-card">
              <div className="fn-card-title">📋 MARKET-RELEVANT NEWS — LAST 72H</div>
              <div className="fn-news-list">
                {news.news_items.map((item,i) => (
                  <div key={i} className="fn-news-item" onClick={()=>toggleItem(i)}>
                    <div className="fn-news-header">
                      <div className="fn-news-meta">
                        <span className="fn-impact-badge" style={{background:impactColor(item.impact_score)+'20',color:impactColor(item.impact_score),borderColor:impactColor(item.impact_score)+'50'}}>
                          {item.impact_score}/10
                        </span>
                        <span className="fn-source-tag">{item.source}</span>
                        <span className="fn-age">{item.age}</span>
                      </div>
                      <div className="fn-news-tags">
                        <span className="fn-sentiment-tag">{item.sentiment}</span>
                        <span className="fn-asset-tag" style={{color:assetColor(item.asset_impact),borderColor:assetColor(item.asset_impact)+'40'}}>
                          {item.asset_impact}
                        </span>
                        <span className="fn-expand-icon">{openItems.has(i)?'▲':'▼'}</span>
                      </div>
                    </div>
                    <div className="fn-news-headline">{item.headline}</div>
                    {openItems.has(i) && (
                      <div className="fn-news-detail">
                        {item.what_happened && (
                          <div className="fn-detail-row">
                            <span className="fn-detail-label">What happened</span>
                            <span>{item.what_happened}</span>
                          </div>
                        )}
                        {item.why_it_matters && (
                          <div className="fn-detail-row">
                            <span className="fn-detail-label">Why it matters</span>
                            <span>{item.why_it_matters}</span>
                          </div>
                        )}
                        {item.expected_reaction && (
                          <div className="fn-detail-row">
                            <span className="fn-detail-label">Expected market reaction</span>
                            <span style={{color:assetColor(item.asset_impact)}}>{item.expected_reaction}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutional Outlook */}
          <div className="fn-card fn-outlook-card">
            <div className="fn-card-title">🏛 FUNDAMENTAL MARKET OUTLOOK — {assetName.toUpperCase()}</div>
            <div className="fn-outlook-text">{news.institutional_outlook}</div>
            <div className="fn-outlook-grid">
              <div className="fn-outlook-item"><span>Fundamental Bias</span><strong style={{color:biasColor(news.fundamental_bias)}}>{news.fundamental_bias}</strong></div>
              <div className="fn-outlook-item"><span>Suggested Position</span><strong style={{color:ac}}>{news.suggested_action}</strong></div>
              <div className="fn-outlook-item"><span>Confidence</span><strong style={{color:ac}}>{news.confidence_score}%</strong></div>
            </div>
            {news.risk_notes && (
              <div className="fn-risk-notes"><span className="fn-risk-label">⚠ Risk Notes:</span> {news.risk_notes}</div>
            )}
          </div>

          {/* Bullish / Bearish Factors */}
          {(news.bias_breakdown?.bullish_factors?.length > 0 || news.bias_breakdown?.bearish_factors?.length > 0) && (
            <div className="fn-factors-row">
              {news.bias_breakdown.bullish_factors?.length > 0 && (
                <div className="fn-card fn-bull-card">
                  <div className="fn-card-title" style={{color:'#10b981'}}>▲ BULLISH FACTORS</div>
                  {news.bias_breakdown.bullish_factors.map((f,i)=>(
                    <div key={i} className="fn-factor-item fn-bull-item">{f}</div>
                  ))}
                </div>
              )}
              {news.bias_breakdown.bearish_factors?.length > 0 && (
                <div className="fn-card fn-bear-card">
                  <div className="fn-card-title" style={{color:'#ef4444'}}>▼ BEARISH FACTORS</div>
                  {news.bias_breakdown.bearish_factors.map((f,i)=>(
                    <div key={i} className="fn-factor-item fn-bear-item">{f}</div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {expanded && !news && !loading && (
        <div className="fn-placeholder">
          <div style={{fontSize:32,opacity:.2}}>📰</div>
          <p>Click <strong>Run News Analysis</strong> to fetch and analyze<br/>
          the latest market-moving news for <strong>{assetName}</strong>.</p>
          <p style={{fontSize:11,color:'var(--muted)',marginTop:8}}>
            Sources: Reuters · Kitco · Forex Factory · Federal Reserve · ECB
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Elliott Wave Widget ─────────────────────────────────────
function ConfidenceBar({ score }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'High' : score >= 50 ? 'Moderate' : 'Low'
  return (
    <div className="ew-confidence">
      <div className="ew-conf-header">
        <span>Elliott Confidence</span>
        <span style={{ color, fontWeight: 700, fontFamily: 'JetBrains Mono,monospace' }}>{score}% — {label}</span>
      </div>
      <div className="ew-conf-bar-bg">
        <div className="ew-conf-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

function RuleRow({ rule }) {
  const color = rule.status === 'CONFIRMED' ? '#10b981' : rule.status === 'VIOLATED' ? '#ef4444' : '#f59e0b'
  const icon  = rule.status === 'CONFIRMED' ? '✓' : rule.status === 'VIOLATED' ? '✗' : '?'
  return (
    <div className="ew-rule-row">
      <span className="ew-rule-icon" style={{ color }}>{icon}</span>
      <div className="ew-rule-body">
        <div className="ew-rule-text">{rule.rule}</div>
        <div className="ew-rule-detail">{rule.detail}</div>
        <div className="ew-rule-section">{rule.ewp_section}</div>
      </div>
    </div>
  )
}

function ElliottWaveWidget({ ticker, timeframe, apiKey, model, yfTicker, onResult }) {
  const [loading,  setLoading]  = useState(false)
  const [ew,       setEw]       = useState(null)
  const [error,    setError]    = useState(null)
  const [expanded, setExpanded] = useState(true)

  const verdictColor = !ew ? '#475569'
    : ew.elliott_verdict === 'VALID_TRADE' ? '#10b981'
    : ew.elliott_verdict === 'WAIT'        ? '#f59e0b'
    : '#ef4444'

  const run = async () => {
    if (!apiKey) return setError('API key required')
    setLoading(true); setError(null)
    try {
      const res = await fetch('/elliott', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: yfTicker || ticker, timeframe, api_key: apiKey, model }),
      })
      const text = await res.text()
      if (!text) throw new Error('Server returned empty response — Elliott analysis may have timed out. Try again, or switch to Opus 4.8.')
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 300)}`) }
      if (!res.ok) throw new Error(data.detail || `Elliott analysis failed (${res.status})`)
      setEw(data)
      if (onResult) onResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ew-widget">
      {/* Header */}
      <div className="ew-header" onClick={() => setExpanded(!expanded)}>
        <div className="ew-header-left">
          <span className="ew-logo">〜</span>
          <div>
            <div className="ew-title">Elliott Wave Analysis</div>
            <div className="ew-subtitle">Frost &amp; Prechter — Elliott Wave Principle</div>
          </div>
        </div>
        <div className="ew-header-right">
          {ew && (
            <span className="ew-verdict-pill" style={{ background: verdictColor + '20', color: verdictColor, borderColor: verdictColor + '50' }}>
              {ew.elliott_verdict}
            </span>
          )}
          <button
            className="ew-run-btn"
            onClick={e => { e.stopPropagation(); run() }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" />Running...</> : '⟳ Run Elliott Analysis'}
          </button>
          <span className="ew-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {model !== 'claude-opus-4-8' && (
        <div className="ew-notice">⚠ Elliott analysis uses a 200K-char knowledge base. Opus 4.8 is strongly recommended — smaller models may fail or time out.</div>
      )}
      {error && <div className="ew-error">⚠ {error}</div>}

      {/* Body */}
      {expanded && ew && (
        <div className="ew-body">

          {/* Row 1: Wave Count + Confidence + Verdict */}
          <div className="ew-top-row">
            <div className="ew-card ew-wave-count">
              <div className="ew-card-title">WAVE COUNT</div>
              <div className="ew-primary-label">{ew.wave_count?.primary_label}</div>
              <div className="ew-tags">
                <span className="ew-tag">{ew.wave_count?.pattern}</span>
                <span className="ew-tag">{ew.wave_count?.degree}</span>
              </div>
              <div className="ew-position">{ew.wave_count?.current_position}</div>
              <div className="ew-subwaves">{ew.wave_count?.sub_waves?.description}</div>
            </div>

            <div className="ew-card ew-conf-card">
              <div className="ew-card-title">CONFIDENCE BREAKDOWN</div>
              <ConfidenceBar score={ew.confidence?.score || 0} />
              <div className="ew-breakdown">
                {Object.entries(ew.confidence?.breakdown || {}).map(([k, v]) => (
                  <div key={k} className="ew-breakdown-row">
                    <span>{k.replace(/_/g,' ')}</span>
                    <div className="ew-mini-bar-bg">
                      <div className="ew-mini-bar-fill" style={{
                        width: `${v}%`,
                        background: v>=70?'#10b981':v>=50?'#f59e0b':'#ef4444'
                      }}/>
                    </div>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'11px', minWidth:28 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ew-card ew-verdict-card">
              <div className="ew-card-title">EWP VERDICT</div>
              <div className="ew-big-verdict" style={{ color: verdictColor }}>
                {ew.elliott_verdict === 'VALID_TRADE' ? '✓ VALID TRADE'
                 : ew.elliott_verdict === 'WAIT'       ? '⏸ WAIT'
                 : '✗ NO TRADE'}
              </div>
              <div className="ew-verdict-reason">{ew.verdict_reason}</div>
              {ew.trade_recommendation?.action !== 'NO_TRADE' && ew.trade_recommendation?.action !== 'WAIT' && (
                <div className={`ew-direction-badge ${ew.trade_recommendation?.direction?.toLowerCase()}`}>
                  {ew.trade_recommendation?.direction === 'Long' ? '▲ LONG' : '▼ SHORT'}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Trade Setup + Fibonacci */}
          {ew.trade_recommendation?.action !== 'NO_TRADE' && (
            <div className="ew-mid-row">
              <div className="ew-card">
                <div className="ew-card-title">🎯 WAVE-BASED TRADE SETUP</div>
                <div className="ew-setup-context">{ew.trade_recommendation?.wave_entry_context}</div>
                <div className="ew-setup-grid">
                  <div className="ew-setup-item"><span>Entry</span><strong>{ew.trade_recommendation?.entry_zone||'—'}</strong></div>
                  <div className="ew-setup-item"><span>Invalidation</span><strong style={{color:'#ef4444'}}>{ew.trade_recommendation?.invalidation_level||'—'}</strong></div>
                  <div className="ew-setup-item"><span>Target 1</span><strong style={{color:'#10b981'}}>{ew.trade_recommendation?.target_1||'—'}</strong></div>
                  <div className="ew-setup-item"><span>Target 2</span><strong style={{color:'#10b981'}}>{ew.trade_recommendation?.target_2||'—'}</strong></div>
                </div>
                <div className="ew-justification">
                  <span>EWP Justification:</span> {ew.trade_recommendation?.ewp_justification}
                </div>
              </div>

              <div className="ew-card">
                <div className="ew-card-title">📐 FIBONACCI LEVELS</div>
                <div className="ew-fib-group">
                  <div className="ew-fib-label" style={{color:'#ef4444'}}>Retracements</div>
                  {ew.fibonacci_levels?.retracements?.map((f,i)=>(
                    <div key={i} className="ew-fib-item">
                      <span className="ew-fib-dot" style={{background:'#ef4444'}}/>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="ew-fib-group">
                  <div className="ew-fib-label" style={{color:'#10b981'}}>Extensions / Targets</div>
                  {ew.fibonacci_levels?.extensions?.map((f,i)=>(
                    <div key={i} className="ew-fib-item">
                      <span className="ew-fib-dot" style={{background:'#10b981'}}/>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                {ew.fibonacci_levels?.key_support && (
                  <div className="ew-fib-pair">
                    <div><span>Key Support</span><strong>{ew.fibonacci_levels.key_support}</strong></div>
                    <div><span>Key Resistance</span><strong>{ew.fibonacci_levels.key_resistance}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Rules Applied */}
          {ew.rules_applied?.length > 0 && (
            <div className="ew-card">
              <div className="ew-card-title">📋 EWP RULES APPLIED (Frost &amp; Prechter)</div>
              <div className="ew-rules-list">
                {ew.rules_applied.map((r, i) => <RuleRow key={i} rule={r} />)}
              </div>
            </div>
          )}

          {/* Row 4: Alternative Counts + Wave Personality */}
          <div className="ew-bottom-row">
            {ew.alternative_counts?.length > 0 && (
              <div className="ew-card">
                <div className="ew-card-title">⚠ ALTERNATIVE COUNTS</div>
                {ew.alternative_counts.map((alt, i) => (
                  <div key={i} className="ew-alt-count">
                    <div className="ew-alt-header">
                      <span className="ew-alt-label">{alt.label}</span>
                      <span className="ew-alt-prob">{alt.probability_pct}%</span>
                    </div>
                    <div className="ew-alt-detail">Invalidation: {alt.invalidation}</div>
                    <div className="ew-alt-detail">{alt.implication}</div>
                  </div>
                ))}
              </div>
            )}
            {ew.wave_personality_notes && (
              <div className="ew-card">
                <div className="ew-card-title">💬 WAVE PERSONALITY (EWP Ch. 2)</div>
                <div className="ew-personality">{ew.wave_personality_notes}</div>
              </div>
            )}
          </div>

        </div>
      )}

      {expanded && !ew && !loading && (
        <div className="ew-placeholder">
          <div style={{fontSize:32, opacity:.2}}>〜</div>
          <p>Click <strong>Run Elliott Analysis</strong> to count waves using the<br/>
          Elliott Wave Principle by Frost &amp; Prechter as the knowledge base.</p>
          <p style={{fontSize:11, color:'var(--muted)', marginTop:8}}>
            This is a separate, deeper analysis — runs independently from the main scan.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Market Terminal ─────────────────────────────────────────
const CATEGORIES = ['Forex','Metals','Energy','Indices']

function AssetCard({ asset, onClick }) {
  const sc   = asset.opportunity_score
  const high = sc >= 8, mid = sc >= 6
  const col  = high ? '#10b981' : mid ? '#f59e0b' : '#ef4444'
  const dot  = high ? '🟢' : mid ? '🟡' : '🔴'
  const dir  = asset.direction_bias === 'BUY' ? '▲' : asset.direction_bias === 'SELL' ? '▼' : '—'
  const chg  = asset.change_pct ?? 0
  return (
    <div className="tm-asset-card" style={{borderColor: col+'44', '--tm-col': col}} onClick={onClick}>
      <div className="tm-asset-header">
        <span className="tm-dot">{dot}</span>
        <span className="tm-asset-name">{asset.name}</span>
        <span className="tm-dir" style={{color: col}}>{dir}</span>
      </div>
      <div className="tm-score" style={{color: col}}>{sc.toFixed(1)}<span className="tm-score-denom">/10</span></div>
      <div className="tm-score-bar"><div className="tm-score-fill" style={{width:`${sc*10}%`, background: col}}/></div>
      <div className="tm-asset-meta">
        <span className="tm-price">{asset.price}</span>
        <span className={`tm-chg ${chg >= 0 ? 'pos' : 'neg'}`}>{chg >= 0 ? '+' : ''}{chg?.toFixed(2)}%</span>
      </div>
      <div className="tm-class" style={{color: col+'cc'}}>{asset.opportunity_class}</div>
      <div className="tm-trend">{asset.trend} · {asset.momentum} · {asset.structure}</div>
    </div>
  )
}

function MarketTerminal({ apiKey, model, onLoadAsset }) {
  const [status,     setStatus]     = useState('STANDBY')
  const [scanResult, setScanResult] = useState(null)
  const [error,      setError]      = useState(null)
  const [scanTime,   setScanTime]   = useState(null)
  const [dots,       setDots]       = useState('')

  useEffect(() => {
    if (status !== 'SCANNING') return
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400)
    return () => clearInterval(id)
  }, [status])

  const startScan = async () => {
    setStatus('SCANNING'); setScanResult(null); setError(null); setDots('')
    const t0 = Date.now()
    try {
      const res  = await fetch('/terminal/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey || null, model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Scan failed')
      setScanResult(data)
      setScanTime(((Date.now() - t0) / 1000).toFixed(1))
      setStatus('COMPLETE')
    } catch (e) {
      setError(e.message); setStatus('ERROR')
    }
  }

  const assets    = scanResult?.assets || []
  const summary   = scanResult?.scan_summary
  const topThree  = [...assets].sort((a,b) => b.opportunity_score - a.opportunity_score).slice(0, 3)
  const byCategory= CATEGORIES.reduce((m, cat) => {
    m[cat] = assets.filter(a => a.name === 'XAU/USD' || a.name === 'XAG/USD'
      ? cat === 'Metals'
      : a.name === 'USOIL' || a.name === 'UKOIL'
      ? cat === 'Energy'
      : a.name === 'NASDAQ' || a.name === "S&P500"
      ? cat === 'Indices'
      : cat === 'Forex')
    return m
  }, {})

  const riskColor = summary?.market_risk === 'Low' ? '#10b981' : summary?.market_risk === 'High' ? '#ef4444' : '#f59e0b'
  const sentColor = summary?.market_sentiment === 'Bullish' ? '#10b981' : summary?.market_sentiment === 'Bearish' ? '#ef4444' : '#f59e0b'

  return (
    <div className="tm-wrapper">
      {/* ── Terminal header ── */}
      <div className="tm-header-bar">
        <div className="tm-header-left">
          <span className="tm-icon">⬡</span>
          <div>
            <div className="tm-title">FIBRIOS MARKET TERMINAL</div>
            <div className="tm-subtitle">Forex · Metals · Energy · Indices — 13 Assets</div>
          </div>
        </div>
        <div className="tm-status-right">
          <div className={`tm-status-dot ${status === 'SCANNING' ? 'blink' : status === 'COMPLETE' ? 'ok' : status === 'ERROR' ? 'err' : ''}`}/>
          <span className="tm-status-text">
            STATUS : {status === 'SCANNING' ? `SCANNING${dots}` : status}
            {status === 'COMPLETE' && scanTime && ` (${scanTime}s)`}
          </span>
        </div>
      </div>

      {/* ── Scan button ── */}
      <div className="tm-scan-zone">
        <button
          className={`tm-scan-btn${status === 'SCANNING' ? ' tm-scan-btn--active' : ''}`}
          onClick={startScan}
          disabled={status === 'SCANNING'}
        >
          {status === 'SCANNING'
            ? <><span className="spinner"/>SCANNING MARKETS…</>
            : status === 'COMPLETE'
            ? <>↺ RE-SCAN MARKETS</>
            : <>▶ START SCAN</>}
        </button>
        {!apiKey && (
          <div className="tm-no-key">⚠ No API key — using algorithmic scoring. Add your key for AI-powered analysis.</div>
        )}
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* ── Asset grid ── */}
      {assets.length > 0 && (
        <>
          {CATEGORIES.map(cat => byCategory[cat]?.length > 0 && (
            <div key={cat} className="tm-category-section">
              <div className="tm-category-title">{cat}</div>
              <div className="tm-asset-grid">
                {byCategory[cat].map(a => (
                  <AssetCard key={a.name} asset={a} onClick={() => onLoadAsset && onLoadAsset(a.name)} />
                ))}
              </div>
            </div>
          ))}

          {/* ── Top 3 Opportunities ── */}
          <div className="tm-top3-section">
            <div className="tm-section-title">TOP 3 OPPORTUNITIES</div>
            <div className="tm-top3-grid">
              {topThree.map((a, i) => {
                const sc   = a.opportunity_score
                const col  = sc >= 8 ? '#10b981' : sc >= 6 ? '#f59e0b' : '#ef4444'
                const tp   = a.trade_proposal
                return (
                  <div key={a.name} className="tm-top3-card" style={{borderColor: col+'55'}}>
                    <div className="tm-top3-rank" style={{color: col}}>#{i+1}</div>
                    <div className="tm-top3-name">{a.name}</div>
                    <div className="tm-top3-score" style={{color: col}}>{sc.toFixed(1)}/10</div>
                    <div className="tm-top3-class" style={{color: col+'cc'}}>{a.opportunity_class}</div>
                    <div className="tm-top3-bias"
                      style={{background: (a.direction_bias==='BUY'?'rgba(16,185,129,.1)':'rgba(239,68,68,.1)'),
                              color: a.direction_bias==='BUY'?'#10b981':'#ef4444'}}>
                      {a.direction_bias==='BUY'?'▲ BUY':a.direction_bias==='SELL'?'▼ SELL':'— NEUTRAL'}
                    </div>
                    <div className="tm-top3-bias-text">{a.institutional_bias}</div>
                    {tp && (
                      <div className="tm-trade-proposal">
                        <div className="tm-tp-row"><span>Entry</span><strong>{tp.entry_zone}</strong></div>
                        <div className="tm-tp-row"><span>Stop</span><strong style={{color:'#ef4444'}}>{tp.stop_loss}</strong></div>
                        <div className="tm-tp-row"><span>TP1</span><strong style={{color:'#10b981'}}>{tp.take_profit_1}</strong></div>
                        <div className="tm-tp-row"><span>TP2</span><strong style={{color:'#10b981'}}>{tp.take_profit_2}</strong></div>
                        <div className="tm-tp-row"><span>R:R</span><strong style={{color:'#06b6d4'}}>{tp.rr_ratio}</strong></div>
                        {tp.setup_notes && <div className="tm-tp-notes">{tp.setup_notes}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Scan Summary ── */}
          {summary && (
            <div className="tm-summary-section">
              <div className="tm-section-title">SCAN SUMMARY</div>
              <div className="tm-summary-grid">
                <div className="tm-summary-item">
                  <span>Market Risk</span>
                  <strong style={{color: riskColor}}>{summary.market_risk}</strong>
                </div>
                <div className="tm-summary-item">
                  <span>Sentiment</span>
                  <strong style={{color: sentColor}}>{summary.market_sentiment}</strong>
                </div>
                <div className="tm-summary-item">
                  <span>Best Asset</span>
                  <strong style={{color:'#10b981'}}>↑ {summary.best_asset}</strong>
                </div>
                <div className="tm-summary-item">
                  <span>Worst Asset</span>
                  <strong style={{color:'#ef4444'}}>↓ {summary.worst_asset}</strong>
                </div>
              </div>
              {summary.summary_note && (
                <div className="tm-summary-note">{summary.summary_note}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {status === 'STANDBY' && (
        <div className="tm-empty">
          <div className="tm-empty-icon">⬡</div>
          <div className="tm-empty-title">Market Terminal Ready</div>
          <div className="tm-empty-sub">Press START SCAN to analyze all 13 assets simultaneously</div>
        </div>
      )}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────
export default function App() {
  const [inputValue,   setInputValue]   = useState('NVDA')
  const [selectedAsset,setSelectedAsset]= useState(null)
  const [timeframe,    setTimeframe]     = useState('1d')
  const [model,        setModel]         = useState('claude-opus-4-8')
  const [apiKey,       setApiKey]        = useState(()=>localStorage.getItem('et_api_key')||'')
  const [showKey,      setShowKey]       = useState(!localStorage.getItem('et_api_key'))
  const [loading,      setLoading]       = useState(false)
  const [analysis,     setAnalysis]      = useState(null)
  const [error,        setError]         = useState(null)
  const [chartTv,      setChartTv]       = useState('NASDAQ:NVDA')
  const [chartTf,      setChartTf]       = useState('1d')
  const [livePrice,    setLivePrice]     = useState(null)
  const [activeYf,     setActiveYf]      = useState('NVDA')
  const [ewData,       setEwData]        = useState(null)
  const [newsData,     setNewsData]      = useState(null)
  const [activePage,   setActivePage]    = useState('analysis')
  const priceTimer = useRef(null)

  const saveKey = (v) => { setApiKey(v); localStorage.setItem('et_api_key',v) }

  // Fetch live price whenever selected asset changes
  const fetchPrice = useCallback(async (yfSymbol) => {
    if(!yfSymbol) return
    try {
      const res = await fetch(`/quote?ticker=${encodeURIComponent(yfSymbol)}`)
      if(res.ok) { const d=await res.json(); setLivePrice(d) }
    } catch(_) {}
  }, [])

  const handleSelect = (asset) => {
    setSelectedAsset(asset)
    setChartTv(asset.tv)
    setActiveYf(asset.yf)
    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(()=>fetchPrice(asset.yf), 300)
  }

  const run = async () => {
    if(!inputValue.trim()) return setError('Enter a ticker symbol')
    if(!apiKey.trim()) return setError('Enter your Claude API key')

    const yfSymbol = selectedAsset?.yf || inputValue.trim().toUpperCase()
    const tvSymbol = selectedAsset?.tv || inputValue.trim().toUpperCase()
    const assetLabel= selectedAsset?.label || inputValue.trim().toUpperCase()

    setLoading(true); setError(null); setAnalysis(null)
    setEwData(null); setNewsData(null)
    setActiveYf(yfSymbol)
    setChartTv(tvSymbol); setChartTf(timeframe)

    try {
      const res = await fetch('/analyze', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ticker:yfSymbol, timeframe, api_key:apiKey, model }),
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.detail||'Analysis failed')
      setAnalysis({ ...data, _assetLabel: assetLabel })
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePDF = () => {
    if(!analysis) return
    generatePDF(analysis, analysis._assetLabel||inputValue, timeframe)
  }

  const sc = analysis?.scores?.overall || 0

  return (
    <div style={{minHeight:'100vh'}}>

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
          <div className="page-tabs">
            <button className={`page-tab${activePage==='analysis'?' page-tab--active':''}`}
              onClick={()=>setActivePage('analysis')}>⚡ ANALYSIS</button>
            <button className={`page-tab${activePage==='terminal'?' page-tab--active':''}`}
              onClick={()=>setActivePage('terminal')}>⬡ TERMINAL</button>
          </div>
          <button className="api-key-toggle" onClick={()=>setShowKey(!showKey)}>
            {showKey?'🔒 Hide':'🔑 API Key'}
          </button>
          {showKey&&(
            <input className="api-input" type="password" placeholder="sk-ant-api..."
              value={apiKey} onChange={e=>saveKey(e.target.value)}/>
          )}
        </div>
      </header>

      {/* ── Market Terminal page ── */}
      {activePage === 'terminal' && (
        <MarketTerminal apiKey={apiKey} model={model} onLoadAsset={(name) => {
          setActivePage('analysis')
          setInputValue(name)
        }}/>
      )}

      {/* ── Analysis page ── */}
      {activePage === 'analysis' && <>

      {/* ── Control Panel ── */}
      <div className="control-panel">
        <div className="control-group">
          <label>ASSET</label>
          <AssetInput
            value={inputValue}
            onChange={(v)=>{ setInputValue(v); if(!v) setSelectedAsset(null) }}
            onSelect={handleSelect}
          />
        </div>
        <div className="control-group">
          <label>TIMEFRAME</label>
          <select className="tf-select" value={timeframe} onChange={e=>setTimeframe(e.target.value)}>
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
          <select className="model-select" value={model} onChange={e=>setModel(e.target.value)}>
            <option value="claude-opus-4-8">Opus 4.8 (Best)</option>
            <option value="claude-sonnet-4-6">Sonnet 4.6 (Fast)</option>
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 (Fastest)</option>
          </select>
        </div>
        <button className={`analyze-btn${loading?' loading':''}`} onClick={run} disabled={loading}>
          {loading?<><span className="spinner"/>ANALYZING...</>:<>⚡ ANALYZE</>}
        </button>

        {/* Live price from TradingView data */}
        {livePrice && (
          <div className="live-price">
            <span className="lp-badge">LIVE</span>
            <span className="lp-price">{livePrice.price}</span>
            <span className={livePrice.change_pct>=0?'lp-pos':'lp-neg'}>
              {livePrice.change_pct>=0?'+':''}{livePrice.change_pct}%
            </span>
          </div>
        )}
      </div>

      {error&&<div className="error-banner">⚠ {error}</div>}

      {/* ── Institutional Decision Card ── */}
      {analysis && (
        <div style={{padding:'0 24px 16px'}}>
          <InstitutionalDecisionCard
            analysis={analysis}
            ew={ewData}
            news={newsData}
            assetLabel={analysis._assetLabel||inputValue}
            timeframe={timeframe}
          />
        </div>
      )}

      {/* ── Chart + Score Panel ── */}
      <div className="main-content">
        <TradingViewChart tvSymbol={chartTv} timeframe={chartTf}/>
        <div className="score-panel">
          <div className="section-title">SETUP QUALITY (0–10)</div>
          {analysis?(
            <>
              <div className="gauges-grid">
                <ScoreGauge score100={analysis.scores.market_structure} label="STRUCTURE"/>
                <ScoreGauge score100={analysis.scores.liquidity}        label="LIQUIDITY"/>
                <ScoreGauge score100={analysis.scores.risk}             label="RISK"/>
                <ScoreGauge score100={analysis.scores.confluence}       label="CONFLUENCE"/>
              </div>
              <div className="overall-score">
                <span className={`overall-number ${vClass(sc)}`}>{to10(sc)}</span>
                <span className={`overall-denom ${vClass(sc)}`}>/10</span>
              </div>
              <div className={`verdict-badge ${vClass(sc)}`}>{vLabel(sc)}</div>
            </>
          ):(
            <div className="placeholder">
              <div className="placeholder-icon">📊</div>
              <p>Enter a ticker symbol,<br/>select a timeframe,<br/>and click Analyze.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Final Decision ── */}
      {analysis&&<FinalDecision analysis={analysis} onDownload={handlePDF}/>}

      {/* ── Analysis Cards ── */}
      {analysis&&(
        <div className="analysis-grid">
          {/* Market Structure */}
          <div className="card">
            <div className="card-title">⬡ MARKET STRUCTURE</div>
            <div className="trend-row">
              <TrendBadge label="Long Term"   trend={analysis.market_structure.long_term_trend}/>
              <TrendBadge label="Medium Term" trend={analysis.market_structure.medium_term_trend}/>
              <TrendBadge label="Short Term"  trend={analysis.market_structure.short_term_trend}/>
            </div>
            <div className="card-text">{analysis.market_structure.analysis}</div>
            {analysis.market_structure.key_patterns?.length>0&&(
              <div className="tags">{analysis.market_structure.key_patterns.map((p,i)=><span key={i} className="tag">{p}</span>)}</div>
            )}
          </div>

          {/* Liquidity */}
          <div className="card">
            <div className="card-title">💧 LIQUIDITY ANALYSIS</div>
            <div className="liquidity-items">
              {analysis.liquidity_analysis.liquidity_pools?.map((p,i)=>(
                <div key={i} className="liquidity-item"><span className="li-dot" style={{background:'#06b6d4'}}/>{p}</div>
              ))}
              {analysis.liquidity_analysis.stop_clusters?.map((c,i)=>(
                <div key={i} className="liquidity-item"><span className="li-dot" style={{background:'#f59e0b'}}/>Stop cluster: {c}</div>
              ))}
              {analysis.liquidity_analysis.sweeps_detected?.map((s,i)=>(
                <div key={i} className="liquidity-item"><span className="li-dot" style={{background:'#8b5cf6'}}/>Sweep: {s}</div>
              ))}
            </div>
            <div className="intent">{analysis.liquidity_analysis.institutional_intentions}</div>
          </div>

          {/* Supply & Demand */}
          <div className="card">
            <div className="card-title">⚡ SUPPLY & DEMAND</div>
            <div className="zones">
              <div className="zone-group">
                <div className="zone-label" style={{color:'#ef4444'}}>SUPPLY ZONES</div>
                {analysis.supply_demand.supply_zones?.map((z,i)=><ZoneRow key={i} zone={z} type="supply"/>)}
              </div>
              <div className="zone-group">
                <div className="zone-label" style={{color:'#10b981'}}>DEMAND ZONES</div>
                {analysis.supply_demand.demand_zones?.map((z,i)=><ZoneRow key={i} zone={z} type="demand"/>)}
              </div>
              {analysis.supply_demand.fair_value_gaps?.length>0&&(
                <div className="zone-group">
                  <div className="zone-label" style={{color:'#8b5cf6'}}>FAIR VALUE GAPS</div>
                  {analysis.supply_demand.fair_value_gaps.map((g,i)=>(
                    <div key={i} className="zone-row" style={{borderLeftColor:'#8b5cf6'}}>
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
            {analysis.trade_plan.valid_setup?(
              <>
                <div>
                  <span className={`direction-badge ${analysis.trade_plan.direction?.toLowerCase()}`}>
                    {analysis.trade_plan.direction==='Long'?'▲ LONG':analysis.trade_plan.direction==='Short'?'▼ SHORT':'— WAIT'}
                  </span>
                </div>
                <div className="trade-row">
                  <div className="trade-item"><span>Entry Zone</span><strong>{analysis.trade_plan.entry_zone}</strong></div>
                  <div className="trade-item"><span>Stop Loss</span><strong style={{color:'#ef4444'}}>{analysis.trade_plan.stop_loss}</strong></div>
                  <div className="trade-item"><span>Target 1</span><strong style={{color:'#10b981'}}>{analysis.trade_plan.take_profit_1}</strong></div>
                  <div className="trade-item"><span>Target 2</span><strong style={{color:'#10b981'}}>{analysis.trade_plan.take_profit_2}</strong></div>
                  <div className="trade-item"><span>R/R Ratio</span><strong style={{color:'#06b6d4'}}>{analysis.trade_plan.rr_ratio}</strong></div>
                </div>
              </>
            ):(
              <div className="no-setup">{analysis.rejection_reason||'No valid setup. Conditions do not meet minimum threshold.'}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Scenarios ── */}
      {analysis&&(
        <div className="scenarios-section">
          <div className="section-title">SCENARIO ANALYSIS</div>
          <div className="scenarios-grid">
            <ScenarioCard type="bullish" data={analysis.scenarios.bullish}/>
            <ScenarioCard type="neutral" data={analysis.scenarios.neutral}/>
            <ScenarioCard type="bearish" data={analysis.scenarios.bearish}/>
          </div>
        </div>
      )}

      {/* ── AI Trade Visualizer ── */}
      {analysis && (
        <div style={{padding:'0 24px 16px'}}>
          <AITradeVisualizer
            analysis={analysis}
            ew={ewData}
            news={newsData}
            yfTicker={activeYf}
            ticker={inputValue}
            timeframe={timeframe}
          />
        </div>
      )}

      {/* ── Fundamental News Widget ── */}
      <div style={{padding:'0 24px 16px'}}>
        <FundamentalNewsWidget
          assetName={selectedAsset?.label || inputValue}
          apiKey={apiKey}
          model={model}
          analysis={analysis}
          onResult={setNewsData}
        />
      </div>

      {/* ── Elliott Wave Widget ── */}
      <div style={{padding:'0 24px 32px'}}>
        <ElliottWaveWidget
          ticker={inputValue}
          timeframe={timeframe}
          apiKey={apiKey}
          model={model}
          yfTicker={activeYf}
          onResult={setEwData}
        />
      </div>

      </>{/* end analysis page */}
    </div>
  )
}
