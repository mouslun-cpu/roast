import Head from 'next/head'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import { ref, onValue, update, set, get } from 'firebase/database'
import { db } from '../lib/firebase'
import { HATS } from '../lib/hatConfig'
import { getDeviceId } from '../lib/utils'
import FlameEffect from '../components/FlameEffect'

// Phases: join → select-group → waiting → target | hat

export default function StudentPage() {
  const router = useRouter()
  const { code: urlCode } = router.query

  const [phase, setPhase]             = useState('join')
  const [sessionCode, setSessionCode] = useState('')
  const [name, setName]               = useState('')
  const [error, setError]             = useState('')
  const [joining, setJoining]         = useState(false)
  const [session, setSession]         = useState(null)
  const [deviceId, setDeviceId]       = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [danmakuText, setDanmakuText] = useState('')
  const [sent, setSent]               = useState(false)

  // Derived
  const me          = session?.students?.[deviceId] ?? null
  const effectiveGid = me?.groupId || selectedGroupId
  const myGroup     = effectiveGid ? session?.groups?.[effectiveGid] : null
  const myHat       = me?.hat ? HATS[me.hat] : null
  const isRoasting  = session?.status === 'roasting'
  const targetGroup = session?.groups?.[session?.targetGroupId]

  useEffect(() => {
    const id = getDeviceId()
    setDeviceId(id)
    if (urlCode) setSessionCode(urlCode)
    const savedName = localStorage.getItem('roast_name')
    if (savedName) setName(savedName)
  }, [urlCode])

  // Session subscription — no phase dependency to avoid stale-closure races
  useEffect(() => {
    if (!sessionCode || !deviceId) return
    return onValue(ref(db, `sessions/${sessionCode}`), snap => {
      if (!snap.exists()) return
      const data = snap.val()
      setSession(data)
      const student = data.students?.[deviceId]
      if (!student) { setPhase('join'); setSession(null); return }
      const roasting = data.status === 'roasting'
      const target   = student.groupId === data.targetGroupId
      setPhase(prev => {
        if (prev === 'join')          return 'join'
        if (roasting && target)       return 'target'
        if (roasting && student.hat)  return 'hat'
        if (prev === 'hat' || prev === 'target') return student.groupId ? 'waiting' : 'select-group'
        if (student.groupId)          return 'waiting'
        return 'select-group'
      })
    })
  }, [sessionCode, deviceId])

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!name.trim()) { setError('請輸入你的名字'); return }
    const c = sessionCode.trim().toUpperCase()
    if (c.length < 6) { setError('請輸入完整的場次代碼'); return }
    setJoining(true)
    try {
      const snap = await get(ref(db, `sessions/${c}`))
      if (!snap.exists()) { setError('找不到這個場次，請確認代碼'); setJoining(false); return }
      const data = snap.val()
      localStorage.setItem('roast_name', name.trim())
      setSessionCode(c)
      setError('')

      const existing = data.students?.[deviceId]
      if (existing) {
        // Returning student — update name, resume correct phase
        await update(ref(db, `sessions/${c}/students/${deviceId}`), { name: name.trim() })
        setSession(data)
        const roasting = data.status === 'roasting'
        const isTarget = existing.groupId === data.targetGroupId
        if (roasting && isTarget)          { setPhase('target') }
        else if (roasting && existing.hat) { setPhase('hat') }
        else if (existing.groupId)         { setSelectedGroupId(existing.groupId); setPhase('waiting') }
        else                               { setPhase('select-group') }
      } else {
        // New student
        await set(ref(db, `sessions/${c}/students/${deviceId}`), {
          name: name.trim(), groupId: null, hat: null, joinedAt: Date.now(),
        })
        setSession(data)
        setPhase('select-group')
      }
    } catch { setError('連線失敗，請稍後再試') }
    setJoining(false)
  }

  const selectGroup = async (groupId) => {
    setSelectedGroupId(groupId)
    setPhase('waiting')
    await update(ref(db, `sessions/${sessionCode}/students/${deviceId}`), { groupId })
  }

  const leaveGroup = async () => {
    await update(ref(db, `sessions/${sessionCode}/students/${deviceId}`), {
      groupId: null, hat: null,
    })
    setSelectedGroupId(null)
    setPhase('select-group')
  }

  const sendDanmaku = async () => {
    if (!danmakuText.trim() || !myHat || !deviceId) return
    const key     = `${Date.now()}_${deviceId}`
    const payload = { text: danmakuText.trim(), hat: myHat.id, hatEmoji: myHat.emoji, ts: Date.now() }
    await set(ref(db, `sessions/${sessionCode}/danmaku/${key}`), payload)
    const tgId = session?.targetGroupId
    if (tgId) await set(ref(db, `sessions/${sessionCode}/archive/${tgId}/${key}`), payload)
    setDanmakuText('')
    setSent(true)
    setTimeout(() => setSent(false), 1500)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>🎤 Roast — 學生端</title></Head>
      <div className="min-h-screen font-tc">
        <AnimatePresence mode="wait">

          {/* ── JOIN ─────────────────────────────────────────────── */}
          {phase === 'join' && (
            <motion.div key="join"
              className="min-h-screen brick-bg flex flex-col items-center justify-center p-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
                <FlameEffect width="100%" height={130} />
              </div>
              <div className="relative z-10 w-full max-w-sm">
                <h1 className="font-impact text-7xl neon-orange text-center mb-1">ROAST</h1>
                <p className="text-orange-600 text-center tracking-widest text-xs mb-10">進入炎上現場</p>
                <div className="flex flex-col gap-4">
                  <input
                    className="w-full bg-gray-900 text-white border border-orange-800 rounded-xl px-4 py-4 text-lg focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="你的暱稱" value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    maxLength={10} />
                  <input
                    className="w-full bg-gray-900 text-white border border-orange-800 rounded-xl px-4 py-4 text-2xl tracking-[0.5em] uppercase text-center font-impact focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="場次代碼" value={sessionCode}
                    onChange={e => setSessionCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                    maxLength={6} />
                  {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                  <button onClick={handleJoin} disabled={joining}
                    className="w-full py-4 rounded-xl font-black text-xl text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #7a1500, #cc3300)', border: '1px solid #ff4400' }}>
                    {joining ? '連線中...' : '🔥 進場！'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── SELECT GROUP ──────────────────────────────────────── */}
          {phase === 'select-group' && session && (
            <motion.div key="select-group"
              className="min-h-screen brick-bg flex flex-col items-center justify-center p-6"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-black text-orange-300 mb-1">你在哪一組？</h2>
              <p className="text-gray-500 text-sm mb-8">選擇你的組別加入</p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {Object.values(session.groups ?? {}).map(group => (
                  <motion.button key={group.id} onClick={() => selectGroup(group.id)}
                    className="py-4 rounded-xl bg-gray-900 border border-orange-900 text-orange-300 font-black hover:border-orange-500 hover:bg-gray-800 transition-all"
                    whileTap={{ scale: 0.93 }}>
                    {group.name}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── WAITING ───────────────────────────────────────────── */}
          {phase === 'waiting' && (
            <motion.div key="waiting"
              className="min-h-screen brick-bg flex flex-col items-center justify-center p-6"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-black text-orange-300 mb-2">等待炙烤開始</h2>
              <p className="text-gray-500 text-sm mb-6">
                你在 <span className="text-orange-400 font-bold">{myGroup?.name}</span>
              </p>
              {(myGroup?.problem || myGroup?.solution) && (
                <div className="bg-gray-900/80 border border-orange-900/40 rounded-xl p-4 max-w-sm w-full mb-6">
                  {myGroup.problem && (
                    <div className="mb-3">
                      <p className="text-orange-500 text-xs font-bold mb-1">探討問題</p>
                      <p className="text-gray-200 text-sm">{myGroup.problem}</p>
                    </div>
                  )}
                  {myGroup.solution && (
                    <div>
                      <p className="text-orange-500 text-xs font-bold mb-1">方案內容</p>
                      <p className="text-gray-200 text-sm">{myGroup.solution}</p>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-center gap-1.5 mb-6">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-orange-700" />
                ))}
              </div>
              <button onClick={leaveGroup}
                className="text-gray-600 text-xs underline hover:text-gray-400 transition-colors">
                ← 選錯了，重新選組
              </button>
            </motion.div>
          )}

          {/* ── TARGET — YOU'RE ON FIRE ───────────────────────────── */}
          {phase === 'target' && (
            <motion.div key="target"
              className="min-h-screen target-bg flex flex-col items-center justify-center p-6 relative overflow-hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                <FlameEffect width="100%" height={200} />
              </div>
              <motion.div className="relative z-10 text-center max-w-sm w-full"
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}>
                <div className="text-8xl mb-4">🔥</div>
                <h2 className="text-3xl font-black text-white drop-shadow-lg mb-3 leading-tight">你正在火線上！</h2>
                <p className="text-red-200 text-lg mb-8">保持冷靜，準備反擊！</p>
                <div className="bg-black/40 rounded-2xl p-5 border border-red-600/40 text-left">
                  {myGroup?.problem && (
                    <>
                      <p className="text-red-400 text-xs font-bold mb-1 uppercase tracking-widest">探討問題</p>
                      <p className="text-white text-base leading-relaxed mb-3">{myGroup.problem}</p>
                      <div className="h-px bg-red-800/40 mb-3" />
                    </>
                  )}
                  <p className="text-red-400 text-xs font-bold mb-2 uppercase tracking-widest">方案內容</p>
                  <p className="text-white text-base leading-relaxed">{myGroup?.solution || '（方案未設定）'}</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── HAT — REVIEWER ────────────────────────────────────── */}
          {phase === 'hat' && myHat && (
            <motion.div key="hat" className="min-h-screen flex flex-col"
              style={{ background: `linear-gradient(180deg, ${myHat.bg} 0%, #080406 70%)` }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">
                <motion.div className={`hat-card hat-${myHat.id} w-full max-w-sm`}
                  initial={{ scale: 0.6, rotateY: 90, opacity: 0 }}
                  animate={{ scale: 1, rotateY: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}>
                  <div className="text-6xl mb-3">{myHat.emoji}</div>
                  <h2 className="text-2xl font-black mb-1" style={{ color: myHat.text }}>{myHat.name}</h2>
                  <p className="text-sm font-bold mb-4 opacity-70" style={{ color: myHat.text }}>{myHat.tagline}</p>
                  <div className="h-px mb-4 opacity-30" style={{ background: myHat.border }} />
                  <p className="text-sm leading-relaxed opacity-85" style={{ color: myHat.text }}>{myHat.prompt}</p>
                </motion.div>
                {targetGroup && (
                  <motion.div className="w-full max-w-sm bg-black/50 rounded-xl p-4 border border-orange-900/40"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-1">🔥 正在被炙烤</p>
                    <p className="text-white font-bold mb-2">{targetGroup.name}</p>
                    {targetGroup.problem && <p className="text-gray-400 text-xs mb-1"><span className="text-orange-700">🔍</span> {targetGroup.problem}</p>}
                    {targetGroup.solution && <p className="text-gray-300 text-sm leading-snug"><span className="text-orange-700">💡</span> {targetGroup.solution}</p>}
                  </motion.div>
                )}
              </div>
              <div className="sticky bottom-0 bg-gray-950/98 border-t border-orange-900/40 p-4">
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input
                    className="flex-1 bg-gray-900 text-white border border-orange-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder={`用 ${myHat.name} 角色吐槽...`}
                    value={danmakuText}
                    onChange={e => setDanmakuText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendDanmaku()}
                    maxLength={50}
                  />
                  <motion.button onClick={sendDanmaku} whileTap={{ scale: 0.9 }}
                    className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: myHat.border, color: myHat.bg, boxShadow: sent ? `0 0 16px ${myHat.border}` : 'none' }}>
                    {sent ? '✓' : '發射！'}
                  </motion.button>
                </div>
                <p className="text-center text-gray-600 text-xs mt-1">{50 - danmakuText.length} 字剩餘</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  )
}
