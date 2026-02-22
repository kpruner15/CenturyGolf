import { useState, useMemo } from 'react'
import { computeEllipse, ellipsePoints, toSVGPath, CHI2, seededRand } from '../utils/ellipse'

export default function DispersionChart({ allData, sessions, selectedClub, setSelectedClub, knownClubs }) {
  const [showMishits, setShowMishits] = useState(true)

  const W = 680, H = 520
  const PAD = { top: 40, right: 40, bottom: 60, left: 70 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const clubData  = useMemo(() => allData.filter(d => d.Club === selectedClub), [allData, selectedClub])
  const visData   = useMemo(() => showMishits ? clubData : clubData.filter(d => d.Type === 'Clean'), [clubData, showMishits])
  const cleanShots  = clubData.filter(d => d.Type === 'Clean')
  const mishitShots = clubData.filter(d => d.Type === 'Mishit')

  const { scaleX, scaleY, xTicks, yTicks, xMinBound, yMaxBound, mx, my } = useMemo(() => {
    const xs = visData.map(d => d.Offline), ys = visData.map(d => d.Flat_Carry)
    if (!xs.length) return { scaleX: 10, scaleY: 10, xTicks: [], yTicks: [], xMinBound: -40, yMaxBound: 200, mx: 0, my: 160 }
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length
    const my = ys.reduce((a, b) => a + b, 0) / ys.length
    const e95 = computeEllipse(xs, ys, CHI2['95%'])
    const ePts = e95 ? ellipsePoints(e95) : []
    const allX = [...xs, ...ePts.map(p => p[0])], allY = [...ys, ...ePts.map(p => p[1])]
    const halfX = Math.max(...allX.map(v => Math.abs(v - mx))) * 1.35 || 40
    const halfY = Math.max(...allY.map(v => Math.abs(v - my))) * 1.35 || 20
    const x0 = mx - halfX, x1 = mx + halfX, y0 = my - halfY, y1 = my + halfY
    const sX = plotW / (x1 - x0), sY = plotH / (y1 - y0)
    const ns = (range, n) => { const r = range/n, m = Math.pow(10, Math.floor(Math.log10(r))), norm = r/m; return (norm<1.5?1:norm<3?2:norm<7?5:10)*m }
    const xStep = ns(x1-x0, 6), yStep = ns(y1-y0, 6), xT = [], yT = []
    for (let v = Math.ceil(x0/xStep)*xStep; v <= x1; v += xStep) xT.push(+v.toFixed(4))
    for (let v = Math.ceil(y0/yStep)*yStep; v <= y1; v += yStep) yT.push(+v.toFixed(4))
    return { scaleX: sX, scaleY: sY, xTicks: xT, yTicks: yT, xMinBound: x0, yMaxBound: y1, mx, my }
  }, [visData, plotW, plotH])

  const sx = v => PAD.left + (v - xMinBound) * scaleX
  const sy = v => PAD.top + (yMaxBound - v) * scaleY
  const xs = visData.map(d => d.Offline), ys = visData.map(d => d.Flat_Carry)

  const ell50 = useMemo(() => { const e = computeEllipse(xs, ys, CHI2['50%']); return e ? toSVGPath(ellipsePoints(e), scaleX, scaleY, PAD.left - xMinBound * scaleX, PAD.top + yMaxBound * scaleY) : null }, [xs.join(), ys.join(), scaleX, scaleY, xMinBound, yMaxBound])
  const ell95 = useMemo(() => { const e = computeEllipse(xs, ys, CHI2['95%']); return e ? toSVGPath(ellipsePoints(e), scaleX, scaleY, PAD.left - xMinBound * scaleX, PAD.top + yMaxBound * scaleY) : null }, [xs.join(), ys.join(), scaleX, scaleY, xMinBound, yMaxBound])

  const jittered = useMemo(() => { const r = seededRand(42); return visData.map(d => ({ ...d, jx: d.Offline + (r()-0.5)*1.2, jy: d.Flat_Carry + (r()-0.5)*0.8 })) }, [visData])

  const meanCarry = arr => arr.length ? (arr.reduce((a,b) => a+b.Flat_Carry, 0) / arr.length).toFixed(1) : '—'
  const stdDev = (arr, key) => { if (arr.length < 2) return '—'; const m = arr.reduce((a,b) => a+b[key], 0)/arr.length; return Math.sqrt(arr.reduce((a,b) => a+(b[key]-m)**2, 0)/(arr.length-1)).toFixed(1) }

  return (
    <div style={{ background: '#0d1117', height: '100%', overflowY: 'auto', padding: '16px', fontFamily: "inherit" }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', color: '#888' }}>Club</label>
          <select value={selectedClub} onChange={e => setSelectedClub(e.target.value)}
            style={{ background: '#1c2130', border: '1px solid #2d3548', borderRadius: '8px', color: '#e0e0e0', padding: '8px 28px 8px 10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: '130px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
            {knownClubs.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
          <div onClick={() => setShowMishits(v => !v)} style={{ width: '36px', height: '20px', borderRadius: '10px', background: showMishits ? '#4a5568' : '#2d3548', position: 'relative', cursor: 'pointer', border: '1px solid #3a4560', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: '2px', left: showMishits ? '17px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: showMishits ? '#90a0c0' : '#555', transition: 'left 0.2s' }} />
          </div>
          Mishits
        </label>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', alignItems: 'center' }}>
          {[['rgba(27,94,32,0.55)', '#2e7d32', '50% CI'], ['rgba(139,195,74,0.2)', 'rgba(139,195,74,0.5)', '95% CI']].map(([bg, border, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '24px', height: '10px', borderRadius: '3px', background: bg, border: `1.5px solid ${border}` }} />
              <span style={{ fontSize: '11px', color: '#888' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* Chart */}
        <div style={{ background: '#131822', borderRadius: '12px', border: '1px solid #1e2840', overflow: 'hidden', flex: '1 1 480px' }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            <defs><clipPath id="plotClip"><rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} /></clipPath></defs>
            {xTicks.map((v, i) => <line key={i} x1={sx(v)} y1={PAD.top} x2={sx(v)} y2={PAD.top+plotH} stroke="#1e2535" strokeWidth="1" />)}
            {yTicks.map((v, i) => <line key={i} x1={PAD.left} y1={sy(v)} x2={PAD.left+plotW} y2={sy(v)} stroke="#1e2535" strokeWidth="1" />)}
            {xTicks.map((v, i) => <text key={i} x={sx(v)} y={PAD.top+plotH+18} textAnchor="middle" fontSize="11" fill="#4a5568">{v}</text>)}
            {yTicks.map((v, i) => <text key={i} x={PAD.left-10} y={sy(v)+4} textAnchor="end" fontSize="11" fill="#4a5568">{v}</text>)}
            <text x={PAD.left+plotW/2} y={H-8} textAnchor="middle" fontSize="12" fill="#4a6080">Offline (yds)</text>
            <text x={16} y={PAD.top+plotH/2} textAnchor="middle" fontSize="12" fill="#4a6080" transform={`rotate(-90,16,${PAD.top+plotH/2})`}>Carry (yds)</text>
            <g clipPath="url(#plotClip)">
              <line x1={sx(0)} y1={PAD.top} x2={sx(0)} y2={PAD.top+plotH} stroke="#2a3550" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1={PAD.left} y1={sy(my)} x2={PAD.left+plotW} y2={sy(my)} stroke="#2a3550" strokeWidth="1" strokeDasharray="3 5" />
              {ell95 && <path d={ell95} fill="rgba(139,195,74,0.13)" stroke="rgba(139,195,74,0.45)" strokeWidth="1.5" />}
              {ell50 && <path d={ell50} fill="rgba(27,94,32,0.45)" stroke="rgba(46,125,50,0.85)" strokeWidth="1.8" />}
              {jittered.map((d, i) => {
                const cx = sx(d.jx), cy = sy(d.jy)
                if (d.Type === 'Mishit') {
                  const s = 3.5
                  return (<g key={i} opacity="0.9"><line x1={cx-s} y1={cy-s} x2={cx+s} y2={cy+s} stroke="#8b1a1a" strokeWidth="1.8" strokeLinecap="round" /><line x1={cx+s} y1={cy-s} x2={cx-s} y2={cy+s} stroke="#8b1a1a" strokeWidth="1.8" strokeLinecap="round" /><title>{`${d.Club} · Carry:${d.Flat_Carry} Off:${d.Offline>0?'+':''}${d.Offline} · Mishit`}</title></g>)
                }
                return (<circle key={i} cx={cx} cy={cy} r={5} fill="#3a3a45" stroke="#6a6a80" strokeWidth="1.2" opacity="0.9"><title>{`${d.Club} · Carry:${d.Flat_Carry} Off:${d.Offline>0?'+':''}${d.Offline} · Clean`}</title></circle>)
              })}
            </g>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="none" stroke="#1e2840" strokeWidth="1" />
          </svg>
        </div>

        {/* Stats panel */}
        <div style={{ minWidth: '180px', flex: '0 0 180px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: '#131822', borderRadius: '12px', border: '1px solid #1e2840', padding: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6080a0', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{selectedClub}</div>
            <StatRow label="Total" value={clubData.length} />
            <StatRow label="Clean" value={cleanShots.length} sub={`${(cleanShots.length/(clubData.length||1)*100).toFixed(0)}%`} />
            <StatRow label="Mishits" value={mishitShots.length} sub={`${(mishitShots.length/(clubData.length||1)*100).toFixed(0)}%`} accent="#886060" />
            <div style={{ borderTop: '1px solid #1e2840', margin: '12px 0' }} />
            <div style={{ fontSize: '10px', color: '#4a6080', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Clean</div>
            <StatRow label="Carry" value={`${meanCarry(cleanShots)} yd`} />
            <StatRow label="σ carry" value={`${stdDev(cleanShots,'Flat_Carry')} yd`} />
            <StatRow label="Offline" value={(()=>{ const m=cleanShots.reduce((a,b)=>a+b.Offline,0)/(cleanShots.length||1); return `${m>0?'+':''}${m.toFixed(1)} yd` })()} />
            <StatRow label="σ offline" value={`${stdDev(cleanShots,'Offline')} yd`} />
            {mishitShots.length > 0 && <>
              <div style={{ borderTop: '1px solid #1e2840', margin: '12px 0' }} />
              <div style={{ fontSize: '10px', color: '#605060', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Mishits</div>
              <StatRow label="Carry" value={`${meanCarry(mishitShots)} yd`} />
              <StatRow label="Loss" value={`−${(parseFloat(meanCarry(cleanShots))-parseFloat(meanCarry(mishitShots))).toFixed(1)} yd`} accent="#886060" />
            </>}
          </div>
          <div style={{ background: '#131822', borderRadius: '12px', border: '1px solid #1e2840', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#4a6080', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>Sessions</div>
            {sessions.map(s => { const n = allData.filter(d=>d.Session===s).length; return (<div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}><span style={{ fontSize: '11px', color: '#5a7090' }}>{s}</span><span style={{ fontSize: '11px', color: '#3a4a5a' }}>{n}</span></div>) })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, sub, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
      <span style={{ fontSize: '11px', color: '#4a5568' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, color: accent || '#8090a8' }}>
        {value}{sub && <span style={{ fontSize: '10px', color: '#4a5568', marginLeft: '3px' }}>({sub})</span>}
      </span>
    </div>
  )
}
