import { useState, useEffect, useRef } from 'react'

// GPS states: 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable'
export function useGPS() {
  const [position, setPosition] = useState(null)   // { lat, lng, accuracy }
  const [status, setStatus] = useState('idle')
  const watchRef = useRef(null)

  function start() {
    if (!navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('requesting')
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,  // meters
        })
        setStatus('active')
      },
      err => {
        if (err.code === err.PERMISSION_DENIED) setStatus('denied')
        else setStatus('unavailable')
      },
      {
        enableHighAccuracy: true,   // uses GPS chip, not cell/wifi
        maximumAge: 2000,           // accept cached position up to 2s old
        timeout: 10000,
      }
    )
  }

  function stop() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setStatus('idle')
    setPosition(null)
  }

  // Clean up on unmount
  useEffect(() => () => stop(), [])

  return { position, status, start, stop }
}
