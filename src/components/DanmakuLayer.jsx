import { useState, useEffect, useRef } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../lib/firebase'
import { HATS } from '../lib/hatConfig'

// Each message gets its own lane (y-position) and scrolls left→right independently.
// All messages accumulate and scroll simultaneously until the target group changes.
// Clicking any item pauses all and shows it centred.

const LANES = 7

const HAT_STYLE = {
  black:  { bg: '#1a1a1a', border: '#666666', color: '#eeeeee', smoke: true },
  red:    { bg: '#5c0000', border: '#ff4422', color: '#ffaaaa' },
  yellow: { bg: '#5a4a00', border: '#ffdd00', color: '#ffee99' },
  green:  { bg: '#004400', border: '#00cc44', color: '#aaffcc', electric: true },
  white:  { bg: '#252535', border: '#8888aa', color: '#ccccee' },
  blue:   { bg: '#001a40', border: '#0088ff', color: '#aaddff' },
}

export default function DanmakuLayer({ sessionCode, active, targetGroupId }) {
  const [items,   setItems]   = useState([])
  const [paused,  setPaused]  = useState(false)
  const [focused, setFocused] = useState(null)
  const seenRef    = useRef(new Set())
  const laneIdxRef = useRef(0)

  // Re-subscribe and clear on every group switch
  useEffect(() => {
    setItems([])
    seenRef.current   = new Set()
    laneIdxRef.current = 0
    setPaused(false)
    setFocused(null)
    if (!active || !sessionCode) return

    return onValue(ref(db, `sessions/${sessionCode}/danmaku`), snap => {
      if (!snap.exists()) {
        setItems([])
        seenRef.current = new Set()
        return
      }
      const toAdd = []
      snap.forEach(child => {
        if (!seenRef.current.has(child.key)) {
          seenRef.current.add(child.key)
          const lane  = laneIdxRef.current % LANES
          laneIdxRef.current++
          const dur   = 12 + Math.random() * 8          // 12–20 s per traversal
          const delay = -(Math.random() * dur).toFixed(2) // random starting phase
          toAdd.push({ ...child.val(), id: child.key, lane, dur, delay })
        }
      })
      if (toAdd.length > 0) setItems(prev => [...prev, ...toAdd])
    })
  }, [active, sessionCode, targetGroupId])

  const handleItemClick = (item, e) => {
    e.stopPropagation()
    setPaused(true)
    setFocused(item)
  }

  const handleDismiss = () => {
    setPaused(false)
    setFocused(null)
  }

  if (!active || items.length === 0) return null

  return (
    <>
      {/* Scrolling layer — container is pointer-events-none, items are auto */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 30 }}>
        {items.map(item => {
          const s      = HAT_STYLE[item.hat] ?? HAT_STYLE.white
          const topPct = 8 + (item.lane / (LANES - 1)) * 76
          return (
            <div
              key={item.id}
              className={`absolute whitespace-nowrap px-5 py-2 rounded-full font-black select-none cursor-pointer${s.smoke ? ' danmaku-smoke' : ''}${s.electric ? ' danmaku-electric' : ''}`}
              style={{
                top: `${topPct}%`,
                left: 0,
                fontSize: '1.6rem',
                lineHeight: 1.4,
                backgroundColor: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
                boxShadow: `0 0 18px ${s.border}99`,
                animation: `danmaku-scroll ${item.dur}s ${item.delay}s linear infinite`,
                animationPlayState: paused ? 'paused' : 'running',
                pointerEvents: 'auto',
              }}
              onClick={e => handleItemClick(item, e)}
            >
              <span className="opacity-70 mr-2">{item.hatEmoji}</span>
              {item.text}
            </div>
          )
        })}
      </div>

      {/* Focus overlay */}
      {paused && focused && (() => {
        const s = HAT_STYLE[focused.hat] ?? HAT_STYLE.white
        return (
          <div
            className="fixed inset-0 flex items-center justify-center cursor-pointer"
            style={{ background: 'rgba(0,0,0,0.78)', zIndex: 50 }}
            onClick={handleDismiss}
          >
            <div
              className="px-14 py-10 rounded-3xl text-center max-w-2xl mx-6"
              style={{
                backgroundColor: s.bg,
                border: `2px solid ${s.border}`,
                boxShadow: `0 0 60px ${s.border}55`,
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-6xl mb-4">{focused.hatEmoji}</div>
              <p className="text-4xl font-black leading-snug" style={{ color: s.color }}>
                {focused.text}
              </p>
              <p className="text-sm mt-6 opacity-40" style={{ color: s.color }}>
                {HATS[focused.hat]?.name} · 點擊背景繼續
              </p>
            </div>
          </div>
        )
      })()}
    </>
  )
}
