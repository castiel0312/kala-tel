import { useMemo } from 'react'
import s from './scene.module.css'

/* ============================================================================
   Oilfield hero scene.

   One conceptual chain, drawn as one section: a weathered steel drum on the
   surface, oil leaving it, the oil falling into the subsurface and breaking
   into data — a trajectory, a risk band, contour lines, travelling packets —
   arriving at a well being drilled right now.

   Everything here is schematic and labelled as such: the depth scale is
   vertically exaggerated, and the geology is the section the API describes
   (Girujan / Tipam / Barail), not a survey.
   ========================================================================== */

const W = 1160
const H = 940

/* depth scale: 0 m at the surface line, 3,600 m at the foot of the canvas */
const SURFACE = 190
const FOOT = 900
const D0 = 0
const D1 = 3600
const y = (d: number) => SURFACE + ((d - D0) / (D1 - D0)) * (FOOT - SURFACE)

/* formation tops from the API section (Girujan 1,856 · Tipam 2,908 · Barail 3,186 m MD) */
const STRATA = [
  { name: 'Sequence above Girujan', sub: '0 – 1,856 m · not in dataset', from: 0, to: 1856, fill: '#1b1d1c', hatch: 'nodata', label: 'Overburden' },
  { name: 'Girujan', sub: '1,856 – 2,908 m · sand / clay', from: 1856, to: 2908, fill: '#3c3a33', hatch: 'sand', label: 'Girujan' },
  { name: 'Tipam', sub: '2,908 – 3,186 m · ferruginous sand', from: 2908, to: 3186, fill: '#45423a', hatch: 'clay', label: 'Tipam' },
  { name: 'Barail', sub: '3,186 m + · the interval under watch', from: 3186, to: 3600, fill: '#4e4636', hatch: 'sand', label: 'Barail' },
]

/* the mud-loss zone from /wells/{id}/risks */
const RISK_ZONE: [number, number] = [3180, 3240]

/* the well being drilled */
const BIT_DEPTH = 3124
const BARAIL_TOP = 3186

export function OilfieldScene() {
  /* the oil path: out of the drum, over the lip, down into the section */
  const oilPath = useMemo(() => 'M 878 168 C 866 186, 852 196, 838 214 C 818 242, 812 268, 806 300 C 798 344, 800 372, 806 404 C 812 436, 820 452, 826 470', [])

  /* where the oil hands over to data: a fan of three lines leaving the stream */
  const fan = [
    'M 826 470 C 760 486, 660 500, 556 512 C 470 522, 400 528, 348 534',
    'M 826 470 C 790 500, 742 540, 700 596 C 668 638, 640 676, 616 716',
    'M 826 470 C 900 486, 980 512, 1046 556',
  ]

  const tickMarks = Array.from({ length: 8 }, (_, i) => D0 + i * 500)
  const fineTicks = Array.from({ length: 29 }, (_, i) => i * 125)

  return (
    <svg
      className={s.scene}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Schematic oilfield section: a drum of oil on the surface, the oil becoming a drilling trajectory, the well reaching the Barail formation, with a mud-loss risk band ahead of the bit"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* --- lithology hatches: distinct texture, restrained value ------------- */}
        <pattern id="h-sand" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
          <rect width="7" height="7" fill="transparent" />
          <circle cx="1.6" cy="1.6" r="0.72" fill="rgba(255,255,255,0.16)" />
          <circle cx="5" cy="4.6" r="0.6" fill="rgba(255,255,255,0.12)" />
          <circle cx="3.4" cy="6" r="0.5" fill="rgba(0,0,0,0.25)" />
        </pattern>
        <pattern id="h-clay" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="transparent" />
          <path d="M0 2h9M0 6h9" stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" />
          <path d="M2 0v2M6 6v3" stroke="rgba(0,0,0,0.3)" strokeWidth="0.7" />
        </pattern>
        <pattern id="h-shale" width="6" height="4" patternUnits="userSpaceOnUse">
          <rect width="6" height="4" fill="transparent" />
          <path d="M0 1h6M0 3h6" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
        </pattern>
        <pattern id="h-nodata" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="transparent" />
          <path d="M0 0v10" stroke="rgba(255,255,255,0.05)" strokeWidth="1.4" />
        </pattern>

        {/* --- ground surface texture ------------------------------------------ */}
        <pattern id="h-hazard" width="14" height="9" patternUnits="userSpaceOnUse" patternTransform="skewX(-24)">
          <rect width="14" height="9" fill="#0a0b0b" />
          <rect width="7" height="9" fill="#f5c518" />
        </pattern>

        {/* --- oil gloss ------------------------------------------------------- */}
        <linearGradient id="g-oil" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0703" />
          <stop offset="38%" stopColor="#2a1c08" />
          <stop offset="55%" stopColor="#6b4a12" />
          <stop offset="72%" stopColor="#1d1406" />
          <stop offset="100%" stopColor="#080603" />
        </linearGradient>
        <linearGradient id="g-barrel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14171a" />
          <stop offset="18%" stopColor="#3b4348" />
          <stop offset="42%" stopColor="#2a3136" />
          <stop offset="70%" stopColor="#1a1e21" />
          <stop offset="100%" stopColor="#0f1113" />
        </linearGradient>
        <linearGradient id="g-barrel-lid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#454d52" />
          <stop offset="100%" stopColor="#1b1f22" />
        </linearGradient>
        <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0f0f" />
          <stop offset="100%" stopColor="#080909" />
        </linearGradient>
        <radialGradient id="g-glow" cx="0.28" cy="0.2" r="0.6">
          <stop offset="0%" stopColor="rgba(245,197,24,0.09)" />
          <stop offset="100%" stopColor="rgba(245,197,24,0)" />
        </radialGradient>
        <linearGradient id="g-bit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe98a" />
          <stop offset="100%" stopColor="#f5c518" />
        </linearGradient>

        <filter id="f-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="f-soft-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* ============================ background ============================= */}
      <rect width={W} height={H} fill="url(#g-sky)" />
      <rect width={W} height={H} fill="url(#g-glow)" />

      {/* faint survey grid above ground — the map plane */}
      <g opacity="0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={40 + i * 130} y1={0} x2={40 + i * 130} y2={SURFACE} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={30 + i * 44} x2={W} y2={30 + i * 44} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
        ))}
      </g>

      {/* structure contours: the Barail top, drawn as a surface above ground */}
      <g fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1}>
        <path d="M40 150 C 180 128, 300 158, 430 140 C 560 122, 700 150, 840 132" />
        <path d="M40 122 C 190 100, 320 130, 450 110 C 580 90, 720 122, 860 100" strokeDasharray="4 4" />
        <path d="M40 96 C 200 76, 340 104, 470 84 C 600 64, 740 96, 880 74" strokeDasharray="4 4" opacity="0.6" />
      </g>
      <text x={880} y={124} fontSize="9" fill="rgba(255,255,255,0.32)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.4">
        BARAIL TOP · CONTOUR
      </text>

      {/* ============================== strata =============================== */}
      <g>
        {STRATA.map((st) => (
          <g key={st.name}>
            <rect x={0} y={y(st.from)} width={W} height={y(st.to) - y(st.from)} fill={st.fill} />
            <rect x={0} y={y(st.from)} width={W} height={y(st.to) - y(st.from)} fill={`url(#h-${st.hatch})`} />
            <line x1={0} x2={W} y1={y(st.from)} y2={y(st.from)} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
          </g>
        ))}

        {/* formation labels, right edge */}
        {STRATA.map((st) => (
          <g key={`l-${st.name}`}>
            <line x1={W - 178} x2={W - 168} y1={y(st.from) + 14} y2={y(st.from) + 14} stroke="rgba(255,255,255,0.4)" />
            <text
              x={W - 160}
              y={y(st.from) + 18}
              fontSize="12"
              fontWeight="700"
              letterSpacing="2.4"
              fill="rgba(255,255,255,0.86)"
              fontFamily="Archivo, sans-serif"
            >
              {st.name.toUpperCase()}
            </text>
            <text x={W - 160} y={y(st.from) + 32} fontSize="9.5" fill="rgba(255,255,255,0.42)" fontFamily="'IBM Plex Mono', monospace">
              {st.sub}
            </text>
          </g>
        ))}
      </g>

      {/* the risk zone, drawn as a band across the whole section */}
      <g>
        <rect x={0} y={y(RISK_ZONE[0])} width={W} height={y(RISK_ZONE[1]) - y(RISK_ZONE[0])} fill="#d33a2b" opacity={0.17} />
        <line x1={0} x2={W} y1={y(RISK_ZONE[0])} y2={y(RISK_ZONE[0])} stroke="#d33a2b" strokeWidth={1} strokeDasharray="7 4" opacity={0.85} />
        <line x1={0} x2={W} y1={y(RISK_ZONE[1])} y2={y(RISK_ZONE[1])} stroke="#d33a2b" strokeWidth={1} strokeDasharray="7 4" opacity={0.85} />
        <text x={250} y={y(RISK_ZONE[0]) - 7} fontSize="9.5" fill="#ff7a68" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.2">
          MUD-LOSS ZONE 3,180 – 3,240 m MD
        </text>
      </g>

      {/* the Barail pick: the top the bit is drilling towards */}
      <g>
        <line x1={0} x2={W} y1={y(BARAIL_TOP)} y2={y(BARAIL_TOP)} stroke="#f5c518" strokeWidth={1.4} opacity={0.9} />
        <rect x={40} y={y(BARAIL_TOP) - 3} width={10} height={3} fill="#f5c518" />
        <text x={56} y={y(BARAIL_TOP) + 14} fontSize="9.5" fill="#f5c518" fontFamily="'IBM Plex Mono', monospace">
          BARAIL TOP · 3,186 m MD · ±12 m
        </text>
      </g>

      {/* ============================ depth ruler ============================ */}
      <g>
        <line x1={40} x2={40} y1={SURFACE} y2={FOOT} stroke="rgba(255,255,255,0.28)" strokeWidth={1} />
        {fineTicks.map((d) => (
          <line key={d} x1={34} x2={40} y1={y(d)} y2={y(d)} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
        ))}
        {tickMarks.map((d) => (
          <g key={`m${d}`}>
            <line x1={26} x2={40} y1={y(d)} y2={y(d)} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
            <text x={22} y={y(d) + 3.5} textAnchor="end" fontSize="9.5" fill="rgba(255,255,255,0.5)" fontFamily="'IBM Plex Mono', monospace">
              {d.toLocaleString('en-IN')}
            </text>
          </g>
        ))}
        <text x={4} y={SURFACE - 8} fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.4">
          m MD
        </text>
        <text x={4} y={FOOT + 16} fontSize="8.5" fill="rgba(255,255,255,0.3)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.2">
          VE ×0.20
        </text>
      </g>

      {/* ============================ nearby wells =========================== */}
      {/* surface markers + hairline trajectories for the offsets */}
      <g opacity="0.85">
        {[
          { x: 316, dev: 26, id: 'W-067', km: '1.2 km', risk: true },
          { x: 520, dev: -22, id: 'W-088', km: '2.4 km', risk: false },
          { x: 606, dev: 34, id: 'W-042', km: '3.1 km', risk: false },
        ].map((w) => (
          <g key={w.id}>
            <line x1={w.x} x2={w.x + w.dev} y1={SURFACE} y2={y(3420)} stroke="rgba(255,255,255,0.3)" strokeWidth={1.4} />
            <circle cx={w.x} cy={SURFACE} r={3} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={1.4} />
            <text x={w.x + 6} y={SURFACE - 8} fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily="'IBM Plex Mono', monospace">
              {w.id} · {w.km}
            </text>
            {w.risk && (
              <g>
                <rect x={w.x + w.dev - 3} y={y(3061) - 3} width={6} height={6} fill="#d33a2b" transform={`rotate(45 ${w.x + w.dev} ${y(3061)})`} />
              </g>
            )}
          </g>
        ))}
      </g>

      {/* ================================= rig ============================== */}
      <g>
        {/* derrick */}
        <path d="M132 190 L150 66 L172 66 L190 190 Z" fill="#15181a" stroke="#3b4348" strokeWidth={1.2} />
        <path d="M150 66 L172 66 L184 118 L138 118 Z" fill="#1b1f22" />
        {/* cross bracing */}
        <g stroke="#454d52" strokeWidth={1} opacity="0.85">
          <path d="M143 148 L185 148M147 118 L181 118M151 90 L177 90" />
          <path d="M150 66 L186 190M172 66 L136 190" opacity="0.55" />
        </g>
        {/* crown block + hook line */}
        <rect x={146} y={56} width={30} height={10} fill="#20262a" stroke="#4a5359" strokeWidth={1} />
        <line x1={161} y1={66} x2={161} y2={150} stroke="#5c666c" strokeWidth={1} />
        {/* drawworks */}
        <rect x={104} y={158} width={44} height={22} fill="#181c1f" stroke="#3b4348" strokeWidth={1.2} />
        <rect x={110} y={164} width={32} height={6} fill="#2a3136" />
        {/* mud tanks */}
        <rect x={196} y={162} width={52} height={20} fill="#181c1f" stroke="#3b4348" strokeWidth={1.2} />
        <line x1={222} y1={162} x2={222} y2={182} stroke="#3b4348" strokeWidth={1} />
        {/* yellow crown accent — the one warm point on the rig */}
        <rect x={146} y={56} width={30} height={3} fill="#f5c518" />
        {/* drill line into the hole */}
        <line x1={161} y1={150} x2={196} y2={SURFACE} stroke="#6b7278" strokeWidth={1.2} />
        <text x={104} y={44} fontSize="9" fill="rgba(255,255,255,0.5)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.4">
          RIG 04
        </text>
      </g>

      {/* ====================== active well trajectory ====================== */}
      <g>
        {/* hole behind the trajectory */}
        <path
          d="M196 190 C 250 300, 300 460, 352 600 C 386 690, 408 760, 424 812"
          stroke="rgba(0,0,0,0.6)"
          strokeWidth={9}
          fill="none"
        />
        {/* the yellow signal: casing/pressure glow */}
        <path
          className={`${s.draw} ${s['draw--delay']}`}
          d="M196 190 C 250 300, 300 460, 352 600 C 386 690, 408 760, 424 812"
          stroke="#f5c518"
          strokeWidth={3.4}
          fill="none"
          strokeDasharray="1200"
          strokeLinecap="round"
        />
        <path
          d="M196 190 C 250 300, 300 460, 352 600 C 386 690, 408 760, 424 812"
          stroke="#fff6d6"
          strokeWidth={1}
          fill="none"
          opacity={0.75}
        />

        {/* wellhead */}
        <rect x={186} y={178} width={20} height={13} fill="#20262a" stroke="#4a5359" strokeWidth={1.2} />
        <circle className={s.wellRing} cx={196} cy={184} r={7} fill="none" stroke="#f5c518" strokeWidth={1.4} />
        <circle cx={196} cy={184} r={3.4} fill="#f5c518" />

        {/* bit */}
        <circle className={s.bitRing} cx={424} cy={812} r={7} fill="none" stroke="#f5c518" strokeWidth={1.6} />
        <circle cx={424} cy={812} r={4.6} fill="url(#g-bit)" />

        {/* depth callout on the bit */}
        <g>
          <line x1={432} x2={470} y1={812} y2={812} stroke="#f5c518" strokeWidth={1} />
          <text x={476} y={809} fontSize="10.5" fill="#f5c518" fontFamily="'IBM Plex Mono', monospace">
            {BIT_DEPTH.toLocaleString('en-IN')} m
          </text>
          <text x={476} y={822} fontSize="8.5" fill="rgba(255,255,255,0.45)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1">
            BIT · TVDSS 2,968 m
          </text>
        </g>

        {/* active well tag */}
        <g>
          <rect x={222} y={92} width={132} height={40} fill="#0a0b0b" stroke="#f5c518" strokeWidth={1} />
          <rect x={222} y={92} width={132} height={3} fill="#f5c518" />
          <text x={232} y={112} fontSize="9" fill="#f5c518" fontFamily="Archivo, sans-serif" fontWeight="700" letterSpacing="2.2">
            ACTIVE WELL
          </text>
          <text x={232} y={126} fontSize="12" fill="#ffffff" fontFamily="'IBM Plex Mono', monospace" fontWeight="500">
            OIL-WELL-104
          </text>
        </g>
        <line x1={222} x2={206} y1={112} y2={180} stroke="#f5c518" strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />

        {/* red risk marker ahead of the bit */}
        <g>
          <rect x={412} y={y(RISK_ZONE[0]) - 4} width={8} height={8} fill="#d33a2b" transform={`rotate(45 ${416} ${y(RISK_ZONE[0])})`} />
          <line x1={416} x2={352} y1={y(RISK_ZONE[0])} y2={y(RISK_ZONE[0]) - 4} stroke="#d33a2b" strokeWidth={1} />
          <rect x={228} y={y(RISK_ZONE[0]) - 22} width={118} height={17} fill="#d33a2b" />
          <text x={236} y={y(RISK_ZONE[0]) - 9.5} fontSize="9" fill="#fff" fontFamily="Archivo, sans-serif" fontWeight="700" letterSpacing="1.4">
            MUD LOSS 83%
          </text>
        </g>
      </g>

      {/* ====================== oil → data → trajectory ===================== */}
      <g>
        {/* the falling oil */}
        <path d={oilPath} stroke="url(#g-oil)" strokeWidth={13} fill="none" strokeLinecap="round" opacity={0.95} />
        <path d={oilPath} stroke="#8a6420" strokeWidth={1.4} fill="none" opacity={0.5} />
        <path
          className={s.oilSheen}
          d={oilPath}
          stroke="#c99b3a"
          strokeWidth={2.4}
          fill="none"
          strokeDasharray="26 120"
          opacity={0.55}
        />
        {/* drips off the stream */}
        {[0, 1, 2].map((i) => (
          <ellipse key={i} className={s.oilDrip} cx={838 - i * 9} cy={250} rx={2.1} ry={4} fill="#5c4212" style={{ animationDelay: `${i * 1.2}s` }} />
        ))}

        {/* the handover: the stream breaks into three data lines */}
        <circle cx={826} cy={470} r={3.4} fill="#f5c518" />
        <circle className={s.wellRing} cx={826} cy={470} r={6} fill="none" stroke="#f5c518" strokeWidth={1.2} />
        {fan.map((d, i) => (
          <path
            key={i}
            className={s.flow}
            d={d}
            stroke="#f5c518"
            strokeWidth={i === 0 ? 1.8 : 1.1}
            fill="none"
            strokeDasharray={i === 0 ? '14 10' : '5 12'}
            opacity={0.62 - i * 0.12}
          />
        ))}

        {/* packets travelling from the drum to the well */}
        {[
          { d: oilPath, delay: 0, r: 2.2 },
          { d: oilPath, delay: 1.7, r: 1.7 },
          { d: oilPath, delay: 3.4, r: 2 },
        ].map((p, i) => (
          <circle key={i} r={p.r} fill="#f5c518">
            <animateMotion dur="5.2s" begin={`${p.delay}s`} repeatCount="indefinite" path={p.d} />
          </circle>
        ))}
        {[
          { d: fan[0], delay: 0.4 },
          { d: fan[0], delay: 2.1 },
          { d: fan[1], delay: 1.2 },
        ].map((p, i) => (
          <circle key={`f${i}`} r={1.6} fill="#ffd84a">
            <animateMotion dur="3.2s" begin={`${p.delay}s`} repeatCount="indefinite" path={p.d} />
          </circle>
        ))}
      </g>

      {/* ============================ the drum =============================== */}
      {/* the visual anchor: weathered steel, yellow stencil, one puncture */}
      <g>
        {/* contact shadow */}
        <ellipse cx={944} cy={192} rx={86} ry={9} fill="#000" opacity={0.55} filter="url(#f-soft)" />

        {/* body */}
        <path d="M872 74 h144 a10 10 0 0 1 10 10 v96 a10 10 0 0 1 -10 10 h-144 a10 10 0 0 1 -10 -10 v-96 a10 10 0 0 1 10 -10 z" fill="url(#g-barrel)" />
        {/* lid */}
        <ellipse cx={944} cy={74} rx={72} ry={13} fill="url(#g-barrel-lid)" stroke="#4a5359" strokeWidth={1} />
        <ellipse cx={944} cy={72} rx={40} ry={7} fill="#22282c" stroke="#3f484e" strokeWidth={1} />
        <circle cx={944} cy={72} r={3.6} fill="#59636a" />
        {/* ribs */}
        <g fill="#12151700" stroke="#0c0e10" strokeWidth={2.4} opacity={0.9}>
          <path d="M862 96 h164" />
          <path d="M862 164 h164" />
        </g>
        <g stroke="#4d565c" strokeWidth={0.8} opacity={0.5}>
          <path d="M862 100 h164" />
          <path d="M862 168 h164" />
        </g>
        {/* vertical seam + weathering */}
        <line x1={880} y1={80} x2={880} y2={186} stroke="#0b0d0f" strokeWidth={1.2} />
        <g opacity={0.5}>
          <path d="M996 108 q-6 22 0 44" stroke="#6a4a1c" strokeWidth={3} fill="none" filter="url(#f-soft-sm)" />
          <path d="M906 130 q-4 16 1 30" stroke="#6a4a1c" strokeWidth={2.4} fill="none" filter="url(#f-soft-sm)" />
          <ellipse cx={966} cy={150} rx={9} ry={16} fill="#5a3f16" opacity={0.35} filter="url(#f-soft-sm)" />
        </g>

        {/* hazard band + stencil: the industrial mark */}
        <g>
          <rect x={862} y={116} width={164} height={9} fill="url(#h-hazard)" />
          <rect x={862} y={116} width={164} height={9} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
        </g>
        <text
          x={944}
          y={146}
          textAnchor="middle"
          fontSize="21"
          fontWeight="900"
          letterSpacing="5"
          fill="#f5c518"
          fontFamily="Archivo, sans-serif"
          opacity={0.94}
        >
          NWIS
        </text>
        <text x={944} y={159} textAnchor="middle" fontSize="7.5" letterSpacing="2.6" fill="rgba(255,255,255,0.42)" fontFamily="'IBM Plex Mono', monospace">
          CRUDE · DEMO
        </text>

        {/* the puncture the oil leaves from */}
        <ellipse cx={876} cy={168} rx={5.4} ry={7} fill="#07090a" stroke="#4a3a18" strokeWidth={1} />
        <ellipse cx={874} cy={166} rx={2.4} ry={3} fill="#8a6420" opacity={0.8} />

        {/* label plate */}
        <g>
          <line x1={1016} x2={1090} y1={150} y2={150} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
          <text x={1094} y={146} fontSize="8.5" fill="rgba(255,255,255,0.55)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.2">
            OIL
          </text>
          <text x={1094} y={159} fontSize="8.5" fill="#f5c518" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.2">
            → DATA
          </text>
        </g>
      </g>

      {/* ========================== scene footnotes ========================== */}
      <g>
        <line x1={40} y1={FOOT + 26} x2={W - 40} y2={FOOT + 26} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
        <text x={40} y={FOOT + 40} fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="'IBM Plex Mono', monospace" letterSpacing="1.2">
          SCHEMATIC SECTION · VERTICALLY EXAGGERATED · FORMATION TOPS FROM THE NWIS API · DEMO DATA
        </text>
      </g>
    </svg>
  )
}
