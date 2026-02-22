import { useState, useEffect } from 'react'
import { SEED_DATA, INITIAL_SESSIONS } from './data/seedData'
import { CLUB_ORDER } from './utils/csv'
import { loadData, saveData } from './utils/storage'
import DispersionChart from './components/DispersionChart'
import MapView from './components/MapView'
import UploadTab from './components/UploadTab'

export default function App() {
  const [tab, setTab]               = useState('chart')   // 'chart' | 'map' | 'upload'
  const [allData, setAllData]       = useState(SEED_DATA)
  const [sessions, setSessions]     = useState(INITIAL_SESSIONS)
  const [selectedClub, setSelectedClub] = useState('7-iron')
  const [storageReady, setStorageReady] = useState(false)

  // ── Load persisted data on mount ──────────────────────────────────────
  useEffect(() => {
    const saved = loadData()
    if (saved) {
      setAllData(saved.data)
      setSessions(saved.sessions)
    }
    setStorageReady(true)
  }, [])

  // ── Persist whenever data changes ────────────────────────────────────
  useEffect(() => {
    if (storageReady) saveData(allData, sessions)
  }, [allData, sessions, storageReady])

  // ── Merge handler called by UploadTab ────────────────────────────────
  function handleMerge(newRows, sessionName) {
    const tagged = newRows.map(r => ({ ...r, Session: sessionName }))
    const filtered = allData.filter(d =>
      !(d.Session === sessionName && tagged.some(t => t.Club === d.Club && t.Shot_No === d.Shot_No))
    )
    setAllData([...filtered, ...tagged])
    if (!sessions.includes(sessionName)) setSessions(s => [...s, sessionName])
  }

  function handleReset() {
    setAllData(SEED_DATA)
    setSessions(INITIAL_SESSIONS)
  }

  const clubData = allData.filter(d => d.Club === selectedClub)
  const knownClubs = CLUB_ORDER.filter(c => allData.some(d => d.Club === c))

  const TAB_BTN = (id, label) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '0 4px', height: '100%',
        background: 'none', border: 'none',
        color: tab === id ? '#ffffff' : '#3a5060',
        fontSize: '10px', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '3px',
        borderTop: tab === id ? '2px solid #4a9060' : '2px solid transparent',
        transition: 'color 0.15s',
      }}
    >
      <span style={{ fontSize: '18px' }}>{id === 'chart' ? '📊' : id === 'map' ? '🗺️' : '📂'}</span>
      {label}
    </button>
  )

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#0d1117',
      fontFamily: "-apple-system, 'Inter', sans-serif",
      color: '#e0e0e0',
    }}>

      {/* ── Content area — fills remaining height ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'chart' && (
          <DispersionChart
            allData={allData}
            sessions={sessions}
            selectedClub={selectedClub}
            setSelectedClub={setSelectedClub}
            knownClubs={knownClubs}
          />
        )}
        {tab === 'map' && (
          <MapView
            clubData={clubData}
            selectedClub={selectedClub}
          />
        )}
        {tab === 'upload' && (
          <UploadTab
            allData={allData}
            sessions={sessions}
            onMerge={handleMerge}
            onReset={handleReset}
          />
        )}
      </div>

      {/* ── Bottom nav bar ── */}
      <div style={{
        height: '64px', display: 'flex',
        background: 'rgba(13,17,23,0.95)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        // Safe area for iPhone home indicator
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TAB_BTN('chart', 'Chart')}
        {TAB_BTN('map', 'On Course')}
        {TAB_BTN('upload', 'Upload')}
      </div>
    </div>
  )
}
