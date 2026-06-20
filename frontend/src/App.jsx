import { useState, useEffect, useRef, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import { searchAssets, TYPE_COLORS } from './assets'

const TV_INTERVALS = { '1m':'1','5m':'5','15m':'15','30m':'30','1h':'60','4h':'240','1d':'D','1w':'W' }

// ─── Score helpers ───────────────────────────────────────────
const to10     = (s) => (s / 10).toFixed(1)
const vLabel   = (s) => s>=90?'ELITE SETUP':s>=80?'STRONG SETUP':s>=70?'GOOD SETUP':s>=60?'WEAK SETUP':'NO VALID SETUP'
const vClass   = (s) => s>=90?'v-elite':s>=80?'v-strong':s>=70?'v-good':s>=60?'v-weak':'v-reject'
const takeTrade= (a) => a.trade_plan.valid_setup && a.scores.overall >= 70

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

function ElliottWaveWidget({ ticker, timeframe, apiKey, model, yfTicker }) {
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
          <button className="api-key-toggle" onClick={()=>setShowKey(!showKey)}>
            {showKey?'🔒 Hide':'🔑 API Key'}
          </button>
          {showKey&&(
            <input className="api-input" type="password" placeholder="sk-ant-api..."
              value={apiKey} onChange={e=>saveKey(e.target.value)}/>
          )}
        </div>
      </header>

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

      {/* ── Elliott Wave Widget ── */}
      <div style={{padding:'0 24px 32px'}}>
        <ElliottWaveWidget
          ticker={inputValue}
          timeframe={timeframe}
          apiKey={apiKey}
          model={model}
          yfTicker={activeYf}
        />
      </div>
    </div>
  )
}
