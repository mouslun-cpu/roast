import Head from 'next/head'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import { ref, onValue, update, set } from 'firebase/database'
import { db } from '../lib/firebase'
import { HATS } from '../lib/hatConfig'
import { getDeviceId } from '../lib/utils'
import FlameEffect from '../components/FlameEffect'

// Phases: edit | waiting | target | hat
export default function LeaderPage() {
  const router = useRouter()
  const { code, group: groupId } = router.query

  const [session, setSession]       = useState(null)
  const [deviceId, setDeviceId]     = useState(null)
  const [name, setName]             = useState('')
  const [editName, setEditName]     = useState('')
  const [editSolution, setEditSolution] = useState('')
  const [editProblem, setEditProblem]   = useState('')
  const [saved, setSaved]           = useState(false)
  const [danmakuText, setDanmakuText] = useState('')
  const [danmakuSent, setDanmakuSent] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const id = getDeviceId()
    setDeviceId(id)
    const savedName = localStorage.getItem('roast_name')
    if (savedName) setName(savedName)
  }, [code])

  // Subscribe to session
  useEffect(() => {
    if (!code) return
    return onValue(ref(db, `sessions/${code}`), snap => {
      if (!snap.exists()) return
      const data = snap.val()
      setSession(data)
      // Sync edit fields with current group data
      const grp = data.groups?.[groupId]
      if (grp) {
        setEditName(prev => prev || grp.name)
        setEditProblem(prev => prev !== '' ? prev : (grp.problem ?? ''))
        setEditSolution(prev => prev !== '' ? prev : (grp.solution ?? ''))
      }
    })
  }, [code, groupId])

  // Redirect back to student page if session resets and our record is gone
  useEffect(() => {
    if (!session || !deviceId || !code) return
    if (me == null) router.replace(`/student?code=${code}`)
  }, [session, deviceId, me, code, router])

  // Derived
  const group      = session?.groups?.[groupId]
  const students   = session?.students ?? {}
  const me         = students[deviceId]
  const members    = Object.entries(students).filter(([, s]) => s.groupId === groupId)
  const isRoasting = session?.status === 'roasting'
  const isTarget   = isRoasting && session?.targetGroupId === groupId
  const myHat      = me?.hat ? HATS[me.hat] : null
  const targetGroup = session?.groups?.[session?.targetGroupId]

  // Determine phase
  const phase = isRoasting && isTarget ? 'target'
              : isRoasting && myHat    ? 'hat'
              : 'edit'

  // ── Actions ──────────────────────────────────────────────────────────
  const saveCard = async () => {
    if (!code || !groupId) return
    await update(ref(db, `sessions/${code}/groups/${groupId}`), {
      name: editName,
      problem: editProblem,
      solution: editSolution,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sendDanmaku = async () => {
    if (!danmakuText.trim() || !myHat || !deviceId) return
    const key     = `${Date.now()}_${deviceId}`
    const payload = { text: danmakuText.trim(), hat: myHat.id, hatEmoji: myHat.emoji, ts: Date.now() }
    await set(ref(db, `sessions/${code}/danmaku/${key}`), payload)
    const tgId = session?.targetGroupId
    if (tgId) await set(ref(db, `sessions/${code}/archive/${tgId}/${key}`), payload)
    setDanmakuText('')
    setDanmakuSent(true)
    setTimeout(() => setDanmakuSent(false), 1500)
    inputRef.current?.focus()
  }

  if (!code || !groupId) return null

  return (
    <>
      <Head><title>📝 Roast — 組長控台</title></Head>

      <div className="min-h-screen font-tc">
        <AnimatePresence mode="wait">

          {/* ── EDIT / WAITING PHASE ─────────────────────────────── */}
          {phase === 'edit' && (
            <motion.div key="edit"
              className="min-h-screen brick-bg flex flex-col"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b border-orange-950">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="font-impact text-2xl neon-orange">🔥 組長控台</h1>
                  <span className="text-xs text-gray-500 font-impact tracking-widest">{code}</span>
                </div>
                <p className="text-orange-400 font-black text-lg">{group?.name ?? groupId}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

                {/* Card editor */}
                <div className="bg-gray-900/80 border border-orange-900 rounded-2xl p-5">
                  <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">📋 編輯方案卡片</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">組別名稱</label>
                      <input
                        className="w-full bg-gray-800 text-orange-200 border border-orange-800 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:border-orange-500 transition-colors"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="組別名稱"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">探討問題</label>
                      <textarea
                        className="w-full bg-gray-800 text-gray-100 border border-orange-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors leading-relaxed"
                        rows={3}
                        value={editProblem}
                        onChange={e => setEditProblem(e.target.value)}
                        placeholder="你們想探討什麼問題？"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">方案內容（讓大家來炙烤的）</label>
                      <textarea
                        className="w-full bg-gray-800 text-gray-100 border border-orange-800 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors leading-relaxed"
                        rows={4}
                        value={editSolution}
                        onChange={e => setEditSolution(e.target.value)}
                        placeholder="請描述你們組的解決方案、專題內容，或任何想被挑戰的點子..."
                      />
                    </div>
                    <motion.button
                      onClick={saveCard}
                      className="w-full py-3 rounded-xl font-black text-base text-white transition-all"
                      style={{
                        background: saved ? 'linear-gradient(135deg, #005500, #007700)' : 'linear-gradient(135deg, #7a1500, #cc3300)',
                        border: saved ? '1px solid #00cc44' : '1px solid #ff4400',
                        boxShadow: saved ? '0 0 16px rgba(0,200,80,0.4)' : 'none',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {saved ? '✓ 已儲存！' : '💾 儲存卡片'}
                    </motion.button>
                  </div>
                </div>

                {/* Member list */}
                <div className="bg-gray-900/80 border border-orange-900/50 rounded-2xl p-5">
                  <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">
                    👥 組員名單（{members.length} 人）
                  </p>
                  {members.length === 0 ? (
                    <p className="text-gray-600 text-sm">尚無組員加入</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {members.map(([id, s]) => (
                        <span key={id} className={`px-3 py-1 rounded-full text-sm ${s.isLeader ? 'bg-orange-900 border border-orange-600 text-orange-200' : 'bg-gray-800 border border-gray-700 text-gray-300'}`}>
                          {s.isLeader ? '📝 ' : '🎓 '}{s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Waiting status */}
                {isRoasting === false && (
                  <div className="text-center py-4">
                    <div className="flex justify-center gap-1.5 mb-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-orange-700" />
                      ))}
                    </div>
                    <p className="text-gray-500 text-sm">等待老師開始炙烤...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── TARGET — YOU'RE ON FIRE ──────────────────────────── */}
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
                <h2 className="text-3xl font-black text-white mb-2">你們正在火線上！</h2>
                <p className="text-red-200 text-lg mb-8">保持冷靜，準備反擊！</p>
                <div className="bg-black/40 rounded-2xl p-5 border border-red-600/40 text-left">
                  {group?.problem && (
                    <>
                      <p className="text-red-400 text-xs font-bold mb-1 uppercase tracking-widest">探討問題</p>
                      <p className="text-white text-base leading-relaxed mb-3">{group.problem}</p>
                      <div className="h-px bg-red-800/40 mb-3" />
                    </>
                  )}
                  <p className="text-red-400 text-xs font-bold mb-2 uppercase tracking-widest">方案內容</p>
                  <p className="text-white text-base leading-relaxed">{group?.solution || '（方案未設定）'}</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── HAT — REVIEWER ──────────────────────────────────── */}
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
                    <p className="text-white font-bold">{targetGroup.name}</p>
                    <p className="text-gray-300 text-sm mt-1 leading-snug">{targetGroup.solution}</p>
                  </motion.div>
                )}
              </div>
              <div className="sticky bottom-0 bg-gray-950/98 border-t border-orange-900/40 p-4">
                <div className="flex gap-2 max-w-sm mx-auto">
                  <input ref={inputRef}
                    className="flex-1 bg-gray-900 text-white border border-orange-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder={`用 ${myHat.name} 角色吐槽...`}
                    value={danmakuText}
                    onChange={e => setDanmakuText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendDanmaku()}
                    maxLength={50}
                  />
                  <motion.button onClick={sendDanmaku} whileTap={{ scale: 0.9 }}
                    className="px-5 py-3 rounded-xl font-bold text-sm"
                    style={{ background: myHat.border, color: myHat.bg, boxShadow: danmakuSent ? `0 0 16px ${myHat.border}` : 'none' }}>
                    {danmakuSent ? '✓' : '發射！'}
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
