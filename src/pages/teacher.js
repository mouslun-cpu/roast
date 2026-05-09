import Head from 'next/head'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import { ref, onValue, update, remove, get } from 'firebase/database'
import dynamic from 'next/dynamic'
import { db } from '../lib/firebase'
import { HAT_ORDER, HATS } from '../lib/hatConfig'
import FlameEffect from '../components/FlameEffect'
import SpotlightOverlay from '../components/SpotlightOverlay'
import DanmakuLayer from '../components/DanmakuLayer'

// QR code only renders client-side
const QRCode = dynamic(() => import('react-qr-code'), { ssr: false })

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function TeacherPage() {
  const router = useRouter()
  const { code } = router.query

  const [session, setSession] = useState(null)
  const [studentUrl, setStudentUrl] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editSolution, setEditSolution] = useState('')
  const [editProblem, setEditProblem] = useState('')
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    if (code && typeof window !== 'undefined') {
      setStudentUrl(`${window.location.origin}/student?code=${code}`)
    }
  }, [code])

  useEffect(() => {
    if (!code) return
    return onValue(ref(db, `sessions/${code}`), snap => {
      if (snap.exists()) setSession(snap.val())
    })
  }, [code])

  // ── Derived ────────────────────────────────────────────────────────────
  const groups     = session?.groups   ?? {}
  const students   = session?.students ?? {}
  const targetGroupId = session?.targetGroupId ?? null
  const isRoasting = session?.status === 'roasting'
  const targetGroup = groups[targetGroupId]
  const studentList = Object.entries(students)

  // Groups that have ≥1 member
  const activeGroupCount = Object.keys(groups).filter(gid =>
    studentList.some(([, s]) => s.groupId === gid)
  ).length

  // Hat assigned to each non-target group — read from group object (written by fireGroup)
  const groupHatMap = {}
  if (isRoasting) {
    Object.keys(groups)
      .filter(id => id !== targetGroupId)
      .forEach(gid => { if (groups[gid]?.hat) groupHatMap[gid] = groups[gid].hat })
  }

  // ── Actions ────────────────────────────────────────────────────────────
  const fireGroup = useCallback(async (targetId) => {
    if (!code) return
    const nonTarget = Object.keys(groups).filter(id => id !== targetId)
    const shuffledHats = shuffleArray(HAT_ORDER)
    const hatForGroup = {}
    nonTarget.forEach((gid, i) => { hatForGroup[gid] = shuffledHats[i % shuffledHats.length] })

    const updates = {}
    // Write hat onto each group object — this is the source of truth for display
    Object.entries(hatForGroup).forEach(([gid, hat]) => {
      updates[`sessions/${code}/groups/${gid}/hat`] = hat
    })
    updates[`sessions/${code}/groups/${targetId}/hat`] = null
    // Also write to each student for real-time student-side display
    studentList.forEach(([sid, s]) => {
      updates[`sessions/${code}/students/${sid}/hat`] =
        s.groupId === targetId ? null : (hatForGroup[s.groupId] ?? null)
    })
    updates[`sessions/${code}/targetGroupId`] = targetId
    updates[`sessions/${code}/status`]        = 'roasting'
    updates[`sessions/${code}/danmaku`]        = null
    await update(ref(db), updates)
  }, [code, groups, studentList])

  const stopRoast = async () => {
    const updates = {
      [`sessions/${code}/targetGroupId`]: null,
      [`sessions/${code}/status`]: 'waiting',
    }
    Object.keys(groups).forEach(gid => {
      updates[`sessions/${code}/groups/${gid}/hat`] = null
    })
    await update(ref(db), updates)
  }

  const downloadRecord = async () => {
    const snap = await get(ref(db, `sessions/${code}/archive`))
    const now  = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    let md = `# ROAST 工作坊紀錄\n生成時間：${now}\n\n---\n\n`
    let hasContent = false

    for (const gid of Object.keys(groups)) {
      const g    = groups[gid]
      const msgs = snap.exists() && snap.val()?.[gid]
        ? Object.values(snap.val()[gid])
        : []
      if (msgs.length === 0) continue
      hasContent = true
      md += `## ${g.name}\n\n`
      if (g.problem)  md += `**探討問題：** ${g.problem}\n\n`
      if (g.solution) md += `**方案內容：** ${g.solution}\n\n`
      md += `### 建議彙整\n\n`
      const byHat = {}
      msgs.forEach(m => { if (!byHat[m.hat]) byHat[m.hat] = []; byHat[m.hat].push(m) })
      for (const hatId of HAT_ORDER) {
        const hatMsgs = byHat[hatId]
        if (!hatMsgs?.length) continue
        const hat = HATS[hatId]
        md += `**${hat.emoji} ${hat.name}**\n`
        hatMsgs.sort((a, b) => a.ts - b.ts).forEach(m => { md += `- ${m.text}\n` })
        md += '\n'
      }
      md += '---\n\n'
    }
    if (!hasContent) { alert('尚無任何彈幕紀錄'); return }
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `roast-${code}-${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const endSession = async () => {
    if (isRoasting) await stopRoast()
    await downloadRecord()
  }

  const resetSession = async () => {
    await update(ref(db, `sessions/${code}`), {
      status: 'waiting',
      targetGroupId: null,
      students: {},
      danmaku: {},
    })
    setShowReset(false)
  }

  const startEdit = (group) => {
    setEditingId(group.id)
    setEditName(group.name)
    setEditProblem(group.problem ?? '')
    setEditSolution(group.solution ?? '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    await update(ref(db, `sessions/${code}/groups/${editingId}`), {
      name: editName,
      problem: editProblem,
      solution: editSolution,
    })
    setEditingId(null)
  }

  // ── Loading guard ──────────────────────────────────────────────────────
  if (!code) return null
  if (!session) return (
    <div className="min-h-screen brick-bg flex items-center justify-center">
      <p className="neon-orange text-xl animate-pulse">載入場次中...</p>
    </div>
  )

  return (
    <>
      <Head><title>🔥 Roast Stage — 老師端</title></Head>

      {/* SVG heat filter — applied ONLY to decorative elements, never to text */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="heat-wave">
            <feTurbulence type="turbulence" baseFrequency="0.02 0.07" numOctaves="3" result="noise">
              <animate attributeName="baseFrequency" dur="4s"
                values="0.02 0.07;0.035 0.1;0.02 0.07" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10"
              xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="min-h-screen brick-bg relative overflow-hidden font-tc">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-orange-950 gap-4">
          {/* Title — never filtered */}
          <h1 className="font-impact text-4xl neon-title tracking-widest shrink-0">
            🔥 ROAST STAGE
          </h1>

          {/* Stats */}
          <div className="flex items-center gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500">已加入組數</div>
              <div className="text-2xl font-black text-orange-400">{activeGroupCount} / {Object.keys(groups).length}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">學生總數</div>
              <div className="text-2xl font-black text-orange-400">{studentList.length}</div>
            </div>
          </div>

          {/* QR + code block */}
          <div className="flex items-center gap-4">
            {/* Reset */}
            {!isRoasting && (
              <button
                onClick={() => setShowReset(true)}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-500 text-xs hover:border-red-800 hover:text-red-400 transition-colors"
              >
                ↺ 重置場次
              </button>
            )}
            {/* End session */}
            <button
              onClick={endSession}
              className="px-3 py-1.5 rounded-lg border border-green-900 text-green-600 text-xs hover:border-green-600 hover:text-green-400 transition-colors"
            >
              📥 結束助教
            </button>

            {/* Session code */}
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-0.5">學生掃碼加入</div>
              {studentUrl && (
                <>
                  <div className="bg-white p-2 rounded-xl inline-block mb-1">
                    <QRCode value={studentUrl} size={80} />
                  </div>
                  <div>
                    <a href={studentUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-orange-500 hover:text-orange-300 underline transition-colors">
                      點擊開啟學生端 ↗
                    </a>
                  </div>
                </>
              )}
              <div className="font-impact text-xl text-white tracking-[0.3em] mt-1">{code}</div>
            </div>
          </div>
        </header>

        {/* ── SETUP VIEW ──────────────────────────────────────────── */}
        {!isRoasting && (
          <main className="relative z-10 p-6">
            <div className="grid grid-cols-3 gap-4 max-w-7xl mx-auto">
              {Object.values(groups).map(group => {
                const members = studentList.filter(([, s]) => s.groupId === group.id)
                const isEditing = editingId === group.id
                const leader = members.find(([, s]) => s.isLeader)

                return (
                  <motion.div key={group.id} className="group-card flex flex-col gap-2" layout whileHover={{ y: -2 }}>
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          className="bg-gray-800 text-orange-200 border border-orange-700 rounded-lg px-3 py-2 font-bold focus:outline-none focus:border-orange-400"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                        <textarea
                          className="bg-gray-800 text-gray-200 border border-orange-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-400"
                          rows={2}
                          value={editProblem}
                          onChange={e => setEditProblem(e.target.value)}
                          placeholder="探討問題..."
                        />
                        <textarea
                          className="bg-gray-800 text-gray-200 border border-orange-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-400"
                          rows={2}
                          value={editSolution}
                          onChange={e => setEditSolution(e.target.value)}
                          placeholder="方案內容..."
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="btn-fire flex-1 py-1.5 text-sm">✓ 儲存</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800">取消</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-black text-orange-300">{group.name}</h2>
                          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{members.length} 人</span>
                        </div>
                        <div
                          className="text-xs min-h-[40px] cursor-pointer leading-relaxed space-y-0.5"
                          onClick={() => startEdit(group)}
                        >
                          {group.problem && <p className="text-gray-400 hover:text-orange-200 transition-colors"><span className="text-orange-800">🔍</span> {group.problem}</p>}
                          {group.solution && <p className="text-gray-400 hover:text-orange-200 transition-colors"><span className="text-orange-800">💡</span> {group.solution}</p>}
                          {!group.problem && !group.solution && <p className="text-gray-600">（尚未設定方案）</p>}
                        </div>
                        {members.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {members.map(([id, s]) => (
                              <span key={id} className={`text-xs px-1.5 py-0.5 rounded-full ${s.isLeader ? 'bg-orange-900 text-orange-200 border border-orange-600' : 'bg-gray-800 text-gray-400'}`}>
                                {s.isLeader ? '📝 ' : ''}{s.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 mt-auto pt-1">
                          <button onClick={() => startEdit(group)} className="py-1.5 px-3 text-xs rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">✏️</button>
                          <button onClick={() => fireGroup(group.id)} className="btn-fire flex-1 py-1.5 text-sm">🔥 炙烤這組</button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {studentList.length === 0 && (
              <p className="text-center text-gray-600 mt-10 text-sm">
                學生掃描 QR Code 或輸入代碼 <span className="text-orange-500 font-bold">{code}</span> 即可加入
              </p>
            )}
          </main>
        )}

        {/* ── ROASTING VIEW ───────────────────────────────────────── */}
        <AnimatePresence>
          {isRoasting && targetGroup && (
            <>
              <SpotlightOverlay />
              <DanmakuLayer sessionCode={code} active={isRoasting} targetGroupId={targetGroupId} />

              {/* Center-stage card — NO filter on this div, text stays crisp */}
              <motion.div
                className="fixed inset-0 flex items-center justify-center pointer-events-none"
                style={{ zIndex: 20 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="flex flex-col items-center">

                  {/* Card wrapper — side flames hang off its edges */}
                  <div className="relative">
                    <div className="absolute -left-20 bottom-0 opacity-65 pointer-events-none" style={{ zIndex: 1 }}>
                      <FlameEffect width={90} height={160} />
                    </div>
                    <div className="absolute -right-20 bottom-0 opacity-65 pointer-events-none" style={{ zIndex: 1 }}>
                      <FlameEffect width={90} height={160} />
                    </div>

                    {/* Card — no filter anywhere, text fully crisp */}
                    <motion.div
                      className="relative rounded-3xl px-12 py-10 text-center w-[640px] border-2 border-orange-500 bg-gray-950/95"
                      style={{
                        boxShadow: '0 0 50px rgba(255,90,0,0.5), 0 0 100px rgba(255,40,0,0.25), inset 0 0 40px rgba(255,40,0,0.06)',
                        zIndex: 2,
                      }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    >
                      <div className="text-6xl mb-2">🔥</div>
                      <h2 className="font-impact text-6xl neon-orange mb-3">{targetGroup.name}</h2>
                      <div className="h-px bg-gradient-to-r from-transparent via-orange-600 to-transparent mb-5" />
                      {targetGroup.problem && (
                        <div className="mb-4 text-left">
                          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-1">探討問題</p>
                          <p className="text-gray-200 text-lg leading-relaxed">{targetGroup.problem}</p>
                        </div>
                      )}
                      {targetGroup.problem && targetGroup.solution && (
                        <div className="h-px bg-gradient-to-r from-transparent via-orange-800/50 to-transparent mb-4" />
                      )}
                      {targetGroup.solution && (
                        <div className="text-left">
                          <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-1">方案內容</p>
                          <p className="text-gray-100 text-xl leading-relaxed">{targetGroup.solution}</p>
                        </div>
                      )}
                      {!targetGroup.problem && !targetGroup.solution && (
                        <p className="text-gray-500 text-xl">（方案未設定）</p>
                      )}
                      <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {studentList.filter(([, s]) => s.groupId === targetGroupId).map(([id, s]) => (
                          <span key={id} className="text-sm bg-red-950 border border-red-700 text-red-300 px-3 py-0.5 rounded-full">{s.name} 🔥</span>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Main flames — normal-flow div below card, fully visible, heat filter here only */}
                  <div className="pointer-events-none" style={{ position: 'relative', zIndex: 1, marginTop: -20, width: 720 }}>
                    <div style={{ filter: 'url(#heat-wave)' }}>
                      <FlameEffect width={720} height={270} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Hat assignment panel */}
              <motion.div
                className="fixed left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ zIndex: 40 }}
                initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
              >
                <div className="bg-gray-950/90 border border-orange-900/60 rounded-2xl p-4 min-w-[180px]">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-widest mb-3">帽子分配</p>
                  {Object.values(groups).map(g => {
                    const isTarget = g.id === targetGroupId
                    const hat = isTarget ? null : HATS[groupHatMap[g.id]]
                    return (
                      <div key={g.id} className={`flex items-center gap-2 py-1 text-sm ${isTarget ? 'text-red-400' : 'text-gray-300'}`}>
                        <span>{isTarget ? '🔥' : (hat?.emoji ?? '—')}</span>
                        <span className="font-bold">{g.name}</span>
                        {!isTarget && hat && <span className="text-xs opacity-60">{hat.name}</span>}
                        {isTarget && <span className="text-xs opacity-60">🎯 靶心</span>}
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Switch-group controls */}
              <motion.div
                className="fixed bottom-5 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 pointer-events-auto"
                style={{ zIndex: 40 }}
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              >
                {Object.values(groups).filter(g => g.id !== targetGroupId).map(g => (
                  <button key={g.id} onClick={() => fireGroup(g.id)}
                    className="px-4 py-2 rounded-full text-sm font-bold text-orange-300 bg-gray-900/95 border border-orange-800 hover:border-orange-500 hover:bg-orange-950/60 transition-all">
                    換烤 {g.name}
                  </button>
                ))}
                <button onClick={stopRoast}
                  className="px-4 py-2 rounded-full text-sm font-bold text-gray-400 bg-gray-900/95 border border-gray-700 hover:bg-gray-800 transition-all">
                  ⏸ 停止
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── RESET CONFIRM MODAL ─────────────────────────────────── */}
        <AnimatePresence>
          {showReset && (
            <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="bg-gray-900 border border-red-900 rounded-2xl p-8 text-center max-w-sm mx-4"
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-xl font-black text-red-400 mb-2">確定要重置場次？</h3>
                <p className="text-gray-400 text-sm mb-6">所有學生資料、彈幕將清除。場次代碼保留。</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowReset(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors">取消</button>
                  <button onClick={resetSession}
                    className="flex-1 py-3 rounded-xl bg-red-900 border border-red-700 text-red-200 hover:bg-red-800 transition-colors font-bold">確認重置</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
