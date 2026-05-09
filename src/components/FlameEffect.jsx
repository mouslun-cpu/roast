// CSS-only multi-layer flame — no heavy libraries needed
const TONGUES = [
  // [left, width, height, animName, duration, delay, blur, blend]
  { l: '2%',  w: 55, h: 95,  a: 'flame-mid',  d: 2.1, dl: 0,    blur: 9,  type: 'outer' },
  { l: '12%', w: 70, h: 135, a: 'flame-core', d: 1.8, dl: 0.2,  blur: 7,  type: 'mid'   },
  { l: '24%', w: 85, h: 170, a: 'flame-mid',  d: 2.3, dl: 0.05, blur: 6,  type: 'core'  },
  { l: '37%', w: 100,h: 205, a: 'flame-core', d: 1.6, dl: 0.3,  blur: 5,  type: 'core'  },
  { l: '50%', w: 95, h: 190, a: 'flame-mid',  d: 2.0, dl: 0.1,  blur: 5,  type: 'core'  },
  { l: '62%', w: 88, h: 175, a: 'flame-core', d: 1.9, dl: 0.4,  blur: 6,  type: 'core'  },
  { l: '74%', w: 72, h: 140, a: 'flame-mid',  d: 2.2, dl: 0.15, blur: 7,  type: 'mid'   },
  { l: '85%', w: 58, h: 100, a: 'flame-mid',  d: 1.7, dl: 0.25, blur: 9,  type: 'outer' },
  // inner hot cores
  { l: '31%', w: 48, h: 125, a: 'flame-tip',  d: 1.4, dl: 0.5,  blur: 4,  type: 'inner' },
  { l: '46%', w: 42, h: 115, a: 'flame-tip',  d: 1.3, dl: 0.2,  blur: 3,  type: 'inner' },
  { l: '60%', w: 40, h: 105, a: 'flame-tip',  d: 1.5, dl: 0.35, blur: 3,  type: 'inner' },
  // tiny white-hot tips
  { l: '40%', w: 22, h: 80,  a: 'flame-tip',  d: 1.1, dl: 0.6,  blur: 2,  type: 'white' },
  { l: '52%', w: 20, h: 70,  a: 'flame-tip',  d: 1.2, dl: 0.1,  blur: 2,  type: 'white' },
]

const GRAD = {
  outer: 'radial-gradient(ellipse 60% 80% at 50% 92%, #aa1100 0%, #770000 45%, transparent 78%)',
  mid:   'radial-gradient(ellipse 60% 80% at 50% 92%, #ff4400 0%, #cc2200 40%, transparent 76%)',
  core:  'radial-gradient(ellipse 60% 80% at 50% 92%, #ff8800 0%, #ff4400 38%, transparent 74%)',
  inner: 'radial-gradient(ellipse 60% 80% at 50% 92%, #ffcc00 0%, #ff8800 40%, transparent 72%)',
  white: 'radial-gradient(ellipse 60% 80% at 50% 92%, rgba(255,255,220,0.95) 0%, #ffee00 35%, transparent 68%)',
}

export default function FlameEffect({ width = '100%', height = 220, className = '' }) {
  return (
    <div
      className={`relative pointer-events-none ${className}`}
      style={{ width, height, overflow: 'visible' }}
    >
      {/* Base glow */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 50,
          background: 'radial-gradient(ellipse 90% 100% at 50% 100%, rgba(255,80,0,0.55), transparent)',
          filter: 'blur(12px)',
          zIndex: 0,
        }}
      />

      {TONGUES.map((t, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{
            left: t.l,
            width: t.w,
            height: t.h,
            background: GRAD[t.type],
            borderRadius: '50% 50% 20% 20% / 80% 80% 20% 20%',
            filter: `blur(${t.blur}px)`,
            transformOrigin: 'bottom center',
            animation: `${t.a} ${t.d}s ${t.dl}s ease-in-out infinite alternate`,
            mixBlendMode: 'screen',
            zIndex: t.type === 'white' ? 6 : t.type === 'inner' ? 5 : t.type === 'core' ? 4 : t.type === 'mid' ? 3 : 2,
          }}
        />
      ))}
    </div>
  )
}
