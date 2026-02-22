import { useEffect, useRef, useState, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import { computeEllipse, ellipsePoints, CHI2, yardsPerPixel, haversineMeters, metersToYards } from '../utils/ellipse'
import { useGPS } from '../hooks/useGPS'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

// ── Constants ─────────────────────────────────────────────────────────────
const DEFAULT_CENTER = [-121.9242, 37.5485] // Pebble Beach — change to your home course
const DEFAULT_ZOOM   = 17                   // Good starting zoom for approach shots

export default function MapView({ clubData, selectedClub }) {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const [zoom, setZoom]           = useState(DEFAULT_ZOOM)
  const [centerLatLng, setCenterLatLng] = useState({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] })
  const [mapReady, setMapReady]   = useState(false)
  const { position, status: gpsStatus, start: startGPS } = useGPS()

  // ── Init Mapbox ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-v9',   // Pure satellite, no labels
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      logoPosition: 'bottom-left',
    })

    // Update zoom + center state as user pans/zooms
    map.current.on('move', () => {
      const c = map.current.getCenter()
      setZoom(map.current.getZoom())
      setCenterLatLng({ lat: c.lat, lng: c.lng })
    })

    map.current.on('load', () => setMapReady(true))

    // Disable map rotation (keeps ellipse orientation intuitive)
    map.current.dragRotate.disable()
    map.current.touchZoomRotate.disableRotation()

    return () => map.current?.remove()
  }, [])

  // ── Compute ellipse dimensions in pixels from yards ──────────────────────
  // This is the core scaling formula: as you zoom in, yardsPerPixel shrinks
  // so the ellipse grows — always representing the same physical area.
  const ellipseStyle = useMemo(() => {
    const cleanShots = clubData.filter(d => d.Type === 'Clean')
    const xs = cleanShots.map(d => d.Offline)
    const ys = cleanShots.map(d => d.Flat_Carry)

    const e95 = computeEllipse(xs, ys, CHI2['95%'])
    const e50 = computeEllipse(xs, ys, CHI2['50%'])
    if (!e95) return null

    const ypp = yardsPerPixel(zoom, centerLatLng.lat)

    // Semi-axes in pixels
    const a95px = e95.a / ypp
    const b95px = e95.b / ypp
    const a50px = e50 ? e50.a / ypp : a95px * 0.6
    const b50px = e50 ? e50.b / ypp : b95px * 0.6

    // Rotation: ellipse angle is in data space (offline=x, carry=y)
    // On screen, carry = up (north), so angle maps directly to SVG rotation
    const angleDeg = (e95.angle * 180) / Math.PI

    return { a95px, b95px, a50px, b50px, angleDeg }
  }, [clubData, zoom, centerLatLng.lat])

  // ── Distance from GPS to screen center ──────────────────────────────────
  const distanceYards = useMemo(() => {
    if (!position) return null
    const meters = haversineMeters(position.lat, position.lng, centerLatLng.lat, centerLatLng.lng)
    return Math.round(metersToYards(meters))
  }, [position, centerLatLng])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0f1a' }}>

      {/* ── Mapbox container — fills the screen, slides under the overlay ── */}
      <div
        ref={mapContainer}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* ── Fixed ellipse overlay — always centered on screen ─────────────
           pointer-events: none lets all touch events pass through to the map */}
      {mapReady && ellipseStyle && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <svg
            width={ellipseStyle.a95px * 2 + 40}
            height={ellipseStyle.b95px * 2 + 40}
            style={{ overflow: 'visible' }}
          >
            <g transform={`translate(${ellipseStyle.a95px + 20}, ${ellipseStyle.b95px + 20}) rotate(${ellipseStyle.angleDeg})`}>

              {/* 95% ellipse — light muted green, very translucent */}
              <ellipse
                rx={ellipseStyle.a95px}
                ry={ellipseStyle.b95px}
                fill="rgba(139, 195, 74, 0.13)"
                stroke="rgba(139, 195, 74, 0.55)"
                strokeWidth="1.5"
              />

              {/* 50% ellipse — dark forest green */}
              <ellipse
                rx={ellipseStyle.a50px}
                ry={ellipseStyle.b50px}
                fill="rgba(27, 94, 32, 0.40)"
                stroke="rgba(46, 125, 50, 0.90)"
                strokeWidth="2"
              />

              {/* Center crosshair — target point */}
              <line x1="-10" y1="0" x2="10" y2="0" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
              <line x1="0" y1="-10" x2="0" y2="10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
              <circle r="2.5" fill="rgba(255,255,255,0.9)" />
            </g>
          </svg>
        </div>
      )}

      {/* ── No token warning ─────────────────────────────────────────────── */}
      {!import.meta.env.VITE_MAPBOX_TOKEN && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '14px', textAlign: 'center', padding: '24px'
        }}>
          <div>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🗺️</div>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Mapbox token not set</div>
            <div style={{ color: '#888', lineHeight: 1.6 }}>
              Add your token to <code>.env.local</code>:<br />
              <code style={{ color: '#7daacc' }}>VITE_MAPBOX_TOKEN=pk.your_token</code>
            </div>
          </div>
        </div>
      )}

      {/* ── Top HUD — distance readout ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(13, 17, 23, 0.82)', backdropFilter: 'blur(8px)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
        padding: '10px 20px', textAlign: 'center', pointerEvents: 'none',
        minWidth: '140px',
      }}>
        {distanceYards !== null ? (
          <>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
              {distanceYards}
            </div>
            <div style={{ fontSize: '11px', color: '#4a7090', marginTop: '2px', letterSpacing: '0.06em' }}>
              YARDS TO TARGET
            </div>
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#3a5060' }}>
            {gpsStatus === 'denied'      ? '📍 GPS denied' :
             gpsStatus === 'requesting'  ? '📍 Getting GPS…' :
             gpsStatus === 'unavailable' ? '📍 GPS unavailable' :
                                           'Drag map to aim'}
          </div>
        )}
      </div>

      {/* ── Bottom bar — club selector + GPS button ───────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(13, 17, 23, 0.90)', backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px 20px',  // extra bottom padding for home indicator
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        {/* Ellipse stats */}
        {ellipseStyle && (
          <div style={{ flex: 1, fontSize: '11px', color: '#4a6080', lineHeight: 1.5 }}>
            <span style={{ color: 'rgba(139,195,74,0.8)' }}>95%</span>{' '}
            {(ellipseStyle.a95px * yardsPerPixel(zoom, centerLatLng.lat)).toFixed(0)} ×{' '}
            {(ellipseStyle.b95px * yardsPerPixel(zoom, centerLatLng.lat)).toFixed(0)} yds
          </div>
        )}

        {/* GPS toggle */}
        <button
          onClick={gpsStatus === 'active' ? undefined : startGPS}
          style={{
            background: gpsStatus === 'active' ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${gpsStatus === 'active' ? 'rgba(46,125,50,0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px', color: '#fff', padding: '8px 16px',
            fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {gpsStatus === 'active' ? '📍 GPS On' :
           gpsStatus === 'requesting' ? '…' : '📍 Enable GPS'}
        </button>

        {/* Zoom level debug (remove in production) */}
        <div style={{ fontSize: '10px', color: '#2a3a4a', minWidth: '40px' }}>
          z{zoom.toFixed(1)}
        </div>
      </div>
    </div>
  )
}
