import Head from 'next/head'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/router'
import { ref, set } from 'firebase/database'
import { db } from '../lib/firebase'
import { generateCode, DEFAULT_GROUPS } from '../lib/utils'
import FlameEffect from '../components/FlameEffect'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState(null) // null | 'teacher' | 'student'
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)

  const createSession = async () => {
    setLoading(true)
    const code = generateCode()
    await set(ref(db, `sessions/${code}`), {
      status: 'waiting',
      targetGroupId: null,
      createdAt: Date.now(),
      groups: DEFAULT_GROUPS,
      students: {},
    })
    router.push(`/teacher?code=${code}`)
  }

  const joinSession = () => {
    const c = joinCode.trim().toUpperCase()
    if (c.length < 6) return
    router.push(`/student?code=${c}`)
  }

  return (
    <>
      <Head><title>🔥 ROAST — 炎上思考帽</title></Head>

      <div className="min-h-screen brick-bg flex flex-col items-center justify-center relative overflow-hidden p-6">
        {/* Decorative flames at bottom */}
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ height: 180 }}>
          <FlameEffect width="100%" height={180} />
        </div>

        {/* Heat distortion SVG filter */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="heat-wave">
              <feTurbulence type="turbulence" baseFrequency="0.015 0.05" numOctaves="3" result="noise">
                <animate attributeName="baseFrequency" dur="5s"
                  values="0.015 0.05;0.025 0.08;0.015 0.05" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="7"
                xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <motion.div
          className="relative z-10 text-center w-full max-w-md"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Logo */}
          <h1
            className="font-impact text-8xl mb-1 select-none"
            style={{
              background: 'linear-gradient(to bottom, #ffee00 0%, #ff8800 40%, #ff2200 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 24px rgba(255,100,0,0.7))',
            }}
          >
            ROAST
          </h1>
          <p className="text-orange-500 tracking-[0.35em] text-sm mb-14 font-tc">
            炎上思考帽工作坊
          </p>

          <AnimatePresence mode="wait">
            {mode === null && (
              <motion.div key="home" className="flex flex-col gap-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button
                  onClick={() => setMode('teacher')}
                  className="py-5 rounded-2xl font-black text-xl text-white transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #7a1500, #cc3300)',
                    border: '1px solid #ff4400',
                    boxShadow: '0 0 30px rgba(255,60,0,0.3)',
                  }}
                >
                  👨‍🏫 我是老師 — 開新場次
                </button>
                <button
                  onClick={() => setMode('student')}
                  className="py-5 rounded-2xl font-black text-xl text-orange-300 bg-gray-900 border border-orange-900 hover:border-orange-600 hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
                >
                  🎓 我是學生 — 加入場次
                </button>
              </motion.div>
            )}

            {mode === 'teacher' && (
              <motion.div key="teacher"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                <p className="text-gray-400 text-sm mb-6">系統將自動建立場次並生成加入碼，分享給學生即可。</p>
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl font-black text-xl text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7a1500, #cc3300)', border: '1px solid #ff4400' }}
                >
                  {loading ? '建立中...' : '🔥 點火開場！'}
                </button>
                <button onClick={() => setMode(null)} className="mt-4 text-gray-500 text-sm underline">← 返回</button>
              </motion.div>
            )}

            {mode === 'student' && (
              <motion.div key="student"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
                <input
                  className="w-full bg-gray-900 text-white border border-orange-800 rounded-xl px-4 py-4 text-3xl tracking-[0.6em] uppercase text-center focus:outline-none focus:border-orange-500 mb-4 font-impact"
                  placeholder="場次代碼"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && joinSession()}
                />
                <button
                  onClick={joinSession}
                  disabled={joinCode.trim().length < 6}
                  className="w-full py-5 rounded-2xl font-black text-xl text-white transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7a1500, #cc3300)', border: '1px solid #ff4400' }}
                >
                  🎤 進場！
                </button>
                <button onClick={() => setMode(null)} className="mt-4 text-gray-500 text-sm underline">← 返回</button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}
