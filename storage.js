import { useState, useRef } from 'react'
import { parseCSV } from '../utils/csv'

export default function UploadTab({ allData, sessions, onMerge, onReset }) {
  const [dragOver, setDragOver]       = useState(false)
  const [preview, setPreview]         = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null) // 'success' | 'error'
  const [uploadMsg, setUploadMsg]     = useState('')
  const [sessionName, setSessionName] = useState('')
  const fileRef = useRef()

  function processFile(file) {
    if (!file) return
    setUploadStatus(null)
    const reader = new FileReader()
    reader.onload = e => {
      const result = parseCSV(e.target.result)
      if (result.error) { setUploadStatus('error'); setUploadMsg(result.error); return }
      const sName = sessionName.trim() || file.name.replace(/\.csv$/i, '')
      const existing = new Set(allData.map(d => `${d.Club}|${d.Shot_No}|${d.Session || ''}`))
      let newCount = 0, updateCount = 0
      result.rows.forEach(r => existing.has(`${r.Club}|${r.Shot_No}|${sName}`) ? updateCount++ : newCount++)
      setPreview({ rows: result.rows, sessionName: sName, newCount, updateCount, fileName: file.name })
    }
    reader.readAsText(file)
  }

  function confirmUpload() {
    if (!preview) return
    onMerge(preview.rows, preview.sessionName)
    setUploadStatus('success')
    setUploadMsg(`✓ ${preview.newCount} new shots added${preview.updateCount > 0 ? `, ${preview.updateCount} updated` : ''} from "${preview.sessionName}".`)
    setPreview(null)
    setSessionName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function cancelUpload() {
    setPreview(null); setUploadStatus(null); setUploadMsg(''); setSessionName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const S = {
    card:     { background: '#131822', borderRadius: '12px', border: '1px solid #1e2840' },
    label:    { fontSize: '12px', color: '#4a6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' },
    input:    { background: '#0d1117', border: '1px solid #2d3548', borderRadius: '8px', color: '#e0e0e0', padding: '10px 14px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
    btn:      { background: '#2e5c3a', border: 'none', borderRadius: '8px', color: '#fff', padding: '10px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    btnGhost: { background: 'none', border: '1px solid #2d3548', borderRadius: '8px', color: '#6a8090', padding: '10px 22px', fontSize: '13px', cursor: 'pointer' },
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px', background: '#0d1117' }}>
      <div style={{ maxWidth: '580px' }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#fff' }}>Upload Shot Data</h2>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#4a6080', lineHeight: 1.6 }}>
          Upload a CSV from your simulator or range session. New shots are appended; existing shots from the same session are updated in place.
        </p>

        {uploadStatus && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px',
            background: uploadStatus === 'success' ? 'rgba(46,92,58,0.3)' : 'rgba(139,26,26,0.3)',
            border: `1px solid ${uploadStatus === 'success' ? '#2e5c3a' : '#8b1a1a'}`,
            color: uploadStatus === 'success' ? '#7ddba0' : '#dd7070' }}>
            {uploadMsg}
          </div>
        )}

        {!preview ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={S.label}>Session Name <span style={{ color: '#3a4a5a', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — defaults to filename)</span></label>
              <input style={S.input} placeholder="e.g. Topgolf Jan 2026" value={sessionName} onChange={e => setSessionName(e.target.value)} />
            </div>

            <div onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragOver ? '#4a9060' : '#2d3548'}`, borderRadius: '12px', padding: '44px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s', background: dragOver ? 'rgba(46,92,58,0.1)' : 'transparent', marginBottom: '20px' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>📂</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#8090a8', marginBottom: '4px' }}>Drop CSV here or tap to browse</div>
              <div style={{ fontSize: '12px', color: '#3a4a5a' }}>Required: Club, Flat_Carry, Offline, Type</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />
            </div>

            <div style={{ ...S.card, padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', color: '#4a6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Required CSV Format</div>
              {[
                ['Club', '"7-iron", "5-wood", etc.'],
                ['Flat_Carry', 'Carry distance in yards'],
                ['Offline', 'Lateral yards — raw from sim (app flips the sign)'],
                ['Type', '"Clean" or "Mishit"'],
              ].map(([col, desc]) => (
                <div key={col} style={{ display: 'flex', gap: '12px', padding: '5px 0', borderBottom: '1px solid #1a2030' }}>
                  <code style={{ fontSize: '12px', color: '#7daacc', minWidth: '95px', fontFamily: 'monospace' }}>{col}</code>
                  <span style={{ fontSize: '12px', color: '#4a6070' }}>{desc}</span>
                </div>
              ))}
              <div style={{ fontSize: '11px', color: '#3a4a5a', marginTop: '10px' }}>Optional: Shot_No, Ball_Speed, Launch_Angle, Height, Landing_Angle, Hang_Time, Curve</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#4a6080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Current Data ({allData.length} shots)
              </div>
              {sessions.map(s => {
                const n = allData.filter(d => d.Session === s).length
                return (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1a2030' }}>
                    <span style={{ fontSize: '13px', color: '#6a8090' }}>{s}</span>
                    <span style={{ fontSize: '13px', color: '#4a5568' }}>{n} shots</span>
                  </div>
                )
              })}
              {sessions.length > 1 && (
                <button onClick={onReset} style={{ ...S.btnGhost, marginTop: '14px', fontSize: '12px', color: '#8b3a3a', borderColor: '#3a2020' }}>
                  Reset to original data
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ ...S.card, padding: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Review Upload</div>
            <div style={{ fontSize: '13px', color: '#4a6080', marginBottom: '20px' }}>{preview.fileName}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[['Session', preview.sessionName], ['New shots', preview.newCount], ['Updated', preview.updateCount]].map(([l, v]) => (
                <div key={l} style={{ background: '#0d1117', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: l === 'Session' ? '13px' : '22px', fontWeight: 700, color: '#7daacc', wordBreak: 'break-word' }}>{v}</div>
                  <div style={{ fontSize: '11px', color: '#4a6080', marginTop: '4px' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', borderRadius: '8px', border: '1px solid #1e2840' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead><tr style={{ background: '#0d1117', position: 'sticky', top: 0 }}>
                  {['Club', 'Carry', 'Offline', 'Type'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4a6080', fontWeight: 600, borderBottom: '1px solid #1e2840' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.rows.slice(0, 30).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #141e2e' }}>
                      <td style={{ padding: '6px 12px', color: '#8090a8' }}>{r.Club}</td>
                      <td style={{ padding: '6px 12px', color: '#8090a8' }}>{r.Flat_Carry}</td>
                      <td style={{ padding: '6px 12px', color: '#8090a8' }}>{r.Offline}</td>
                      <td style={{ padding: '6px 12px', color: r.Type === 'Mishit' ? '#8b4a4a' : '#4a8060' }}>{r.Type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 30 && <div style={{ padding: '8px 12px', fontSize: '11px', color: '#3a4a5a', textAlign: 'center' }}>+{preview.rows.length - 30} more rows</div>}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={confirmUpload} style={S.btn}>Confirm &amp; Merge</button>
              <button onClick={cancelUpload} style={S.btnGhost}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
