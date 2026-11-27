// Scenes for the v3 promo (about 2 minutes, src/Promo3.tsx). Visual tokens are the game's own (theme.ts).
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Freeze,
  Img,
  interpolate,
  Loop,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Clip } from './parts';
import { T } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);
const snap = Easing.bezier(0.2, 1.4, 0.4, 1);

// section heading at the top centre
export const Heading: React.FC<{ text: string; sub?: string; top?: number }> = ({
  text,
  sub,
  top = 46,
}) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [2, 14], [0, 1], clamp);
  const y = interpolate(f, [2, 18], [18, 0], { ...clamp, easing: out });
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: op,
        transform: `translateY(${y}px)`,
        fontFamily: T.font,
      }}
    >
      <span
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 3,
          textShadow: '0 4px 18px rgba(0,0,0,.5)',
        }}
      >
        {text}
      </span>
      {sub ? (
        <span
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: T.accent,
            marginLeft: 22,
            letterSpacing: 2,
          }}
        >
          {sub}
        </span>
      ) : null}
    </div>
  );
};

// a tile caption: name in a pill, one plain line under it
const TileLabel: React.FC<{ name: string; desc: string; on: boolean }> = ({ name, desc, on }) => (
  <div style={{ fontFamily: T.font, textAlign: 'center', marginTop: 14 }}>
    <span
      style={{
        display: 'inline-block',
        fontSize: 28,
        fontWeight: 800,
        letterSpacing: 1,
        padding: '5px 18px',
        borderRadius: 999,
        color: on ? T.ink : '#fff',
        background: on ? T.accent : 'rgba(13,16,32,.7)',
        border: `1.5px solid ${on ? T.accent : 'rgba(255,255,255,.25)'}`,
      }}
    >
      {name}
    </span>
    <div
      style={{
        fontSize: 23,
        fontWeight: 500,
        color: on ? '#fff' : T.muted,
        marginTop: 8,
        letterSpacing: 1,
      }}
    >
      {desc}
    </div>
  </div>
);

export type Tile = {
  clip: string;
  name: string;
  desc: string;
  from?: number;
  rate?: number;
  zoom?: number;
  origin?: string;
  len?: number; // source length in frames: the tile loops it from `from` so a short clip never runs out
};

// landscape six-grid (3 x 2): tiles light up one after another (wall-reveal · bento-light-up), then each takes focus in turn
export const LandGrid: React.FC<{
  dur: number;
  tiles: Tile[];
  title: string;
  sub?: string;
  bg: string;
  bgFrom?: number;
  cols?: number; // 3 (3 x 2) or 2 (2 x 2, bigger tiles)
}> = ({ dur, tiles, title, sub, bg, bgFrom = 0, cols = 3 }) => {
  const f = useCurrentFrame();
  const W = cols === 2 ? 560 : 500,
    H = Math.round((W * 9) / 16),
    gx = cols === 2 ? 90 : 56,
    gy = cols === 2 ? 132 : 128;
  const x0 = (1920 - (cols * W + (cols - 1) * gx)) / 2,
    y0 = cols === 2 ? 140 : 160;
  const focus0 = 26,
    slot = (dur - focus0 - 14) / tiles.length;
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill
        style={{ filter: 'blur(28px) brightness(.38) saturate(1.2)', transform: 'scale(1.12)' }}
      >
        <Clip name={bg} from={bgFrom} rate={0.5} />
      </AbsoluteFill>
      <Heading text={title} sub={sub} />
      {tiles.map((t, k) => {
        const c = k % cols,
          r = Math.floor(k / cols);
        // bento: each cell lights up in place, 4 frames apart, no travel
        const lit = interpolate(f, [k * 4, k * 4 + 10], [0, 1], { ...clamp, easing: out });
        const s0 = focus0 + k * slot;
        const active = f >= s0 && f < s0 + slot && f < dur - 10;
        const sc = interpolate(
          f,
          [s0, s0 + 8, s0 + slot - 6, s0 + slot],
          [1, 1.05, 1.05, 1],
          clamp
        );
        return (
          <div
            key={t.clip + k}
            style={{
              position: 'absolute',
              left: x0 + c * (W + gx),
              top: y0 + r * (H + gy),
              width: W,
              transform: `scale(${sc})`,
              zIndex: active ? 2 : 1,
              opacity: lit,
            }}
          >
            <div
              style={{
                width: W,
                height: H,
                borderRadius: 18,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: active
                  ? `0 0 0 4px ${T.accent}, 0 22px 50px rgba(0,0,0,.6)`
                  : '0 16px 40px rgba(0,0,0,.5)',
                filter: active || f < focus0 || f >= dur - 10 ? 'none' : 'brightness(.62)',
              }}
            >
              {(() => {
                const v = (
                  <OffthreadVideo
                    src={staticFile(`clips/${t.clip}.mp4`)}
                    startFrom={t.from || 0}
                    playbackRate={t.rate || 1}
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: `scale(${t.zoom || 1})`,
                      transformOrigin: t.origin || '50% 50%',
                    }}
                  />
                );
                return t.len ? (
                  <Loop durationInFrames={Math.floor((t.len - (t.from || 0)) / (t.rate || 1)) - 1}>
                    {v}
                  </Loop>
                ) : (
                  v
                );
              })()}
            </div>
            <TileLabel name={t.name} desc={t.desc} on={active} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// six phones in a row, each its own recorded app session
export const PhoneRow: React.FC<{ dur: number; tiles: Tile[] }> = ({ dur, tiles }) => {
  const f = useCurrentFrame();
  const H = 600,
    W = Math.round((H * 600) / 1260),
    gap = 22;
  const total = tiles.length * W + (tiles.length - 1) * gap;
  const focus0 = 22,
    slot = (dur - focus0 - 12) / tiles.length;
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill
        style={{ filter: 'blur(26px) brightness(.42) saturate(1.2)', transform: 'scale(1.1)' }}
      >
        <Clip name="b07_phone" from={0} rate={0.4} />
      </AbsoluteFill>
      <Heading text="一支手機，校園生活全在裡面" sub="i-Piyan · 25 個 App 都能用" />
      {tiles.map((a, k) => {
        const t0 = Math.round(k * 4.2 - k * k * 0.25);
        const y = interpolate(f, [t0, t0 + 14], [700, 0], { ...clamp, easing: out });
        const s0 = focus0 + k * slot;
        const active = f >= s0 && f < s0 + slot && f < dur - 10;
        const s = interpolate(f, [s0, s0 + 8, s0 + slot - 6, s0 + slot], [1, 1.06, 1.06, 1], clamp);
        return (
          <div
            key={a.clip}
            style={{
              position: 'absolute',
              left: (1920 - total) / 2 + k * (W + gap),
              top: 160,
              width: W,
              transform: `translateY(${y}px) scale(${s})`,
              zIndex: active ? 2 : 1,
            }}
          >
            <div
              style={{
                width: W,
                height: H,
                borderRadius: 40,
                overflow: 'hidden',
                boxShadow: active
                  ? `0 0 0 4px ${T.accent}, 0 24px 60px rgba(0,0,0,.6)`
                  : '0 18px 44px rgba(0,0,0,.5)',
                filter: active || f < focus0 || f >= dur - 10 ? 'none' : 'brightness(.66)',
              }}
            >
              <OffthreadVideo
                src={staticFile(`clips/${a.clip}.mp4`)}
                startFrom={a.from || 0}
                playbackRate={a.rate || 1}
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <TileLabel name={a.name} desc={a.desc} on={active} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// campus tour: the big map pushes in, then quick cuts to four places, each with its name
export const MapTour: React.FC<{
  mapDur: number;
  cut: number;
  stops: { clip: string; from?: number; name: string; sub?: string }[];
}> = ({ mapDur, cut, stops }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, mapDur], [1.0, 1.35], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <Sequence durationInFrames={mapDur}>
        <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: '50% 52%' }}>
          <Img src={staticFile('stills/m_map.jpg')} style={{ width: '100%', height: '100%' }} />
        </AbsoluteFill>
        <Heading text="校園導覽" sub="手機地圖點哪，就去哪" />
      </Sequence>
      {stops.map((s, k) => (
        <Sequence key={s.clip} from={mapDur + k * cut} durationInFrames={cut}>
          <Clip name={s.clip} from={s.from || 0} />
          <PlaceTag name={s.name} sub={s.sub} dur={cut} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// a place name pinned at the top-left with a map-pin dot
export const PlaceTag: React.FC<{ name: string; sub?: string; dur: number }> = ({
  name,
  sub,
  dur,
}) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, 9], [-40, 0], { ...clamp, easing: out });
  const op = interpolate(f, [0, 6, dur - 4, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ padding: 72, opacity: op }}>
      <div
        style={{
          transform: `translateX(${x}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: T.font,
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: T.red,
            boxShadow: '0 0 0 6px rgba(232,50,60,.3)',
          }}
        />
        <span
          style={{
            fontSize: 46,
            fontWeight: 800,
            color: T.ink,
            background: T.accent,
            padding: '8px 24px',
            borderRadius: 10,
            letterSpacing: 2,
            boxShadow: '0 8px 28px rgba(0,0,0,.35)',
          }}
        >
          {name}
        </span>
        {sub ? (
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#fff',
              letterSpacing: 1,
              textShadow: '0 2px 10px rgba(0,0,0,.7)',
            }}
          >
            {sub}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// chapter / breathing card: words stamp onto dark paper one by one, one word in the accent colour (paper-title-card)
export const ChapterCard: React.FC<{
  kicker?: string;
  words: string[];
  accent?: number;
  dur: number;
}> = ({ kicker, words, accent = -1, dur }) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [dur - 6, dur], [1, 0], clamp);
  const k = interpolate(f, [0, 8], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 50% 48%, #1b2140 0%, ${T.ink} 70%)`,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: fade,
        fontFamily: T.font,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {kicker ? (
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: T.accent,
              letterSpacing: 10,
              marginBottom: 22,
              opacity: k,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <div style={{ fontSize: 84, fontWeight: 900, color: '#fff', letterSpacing: 4 }}>
          {words.map((w, i) => {
            const t0 = 4 + i * 5;
            const op = interpolate(f, [t0, t0 + 3], [0, 1], clamp);
            const s = interpolate(f, [t0, t0 + 6], [1.35, 1], { ...clamp, easing: snap });
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: op,
                  transform: `scale(${s})`,
                  color: i === accent ? T.accent : '#fff',
                  fontStyle: i === accent ? 'italic' : 'normal',
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div
          style={{
            height: 6,
            width: 120,
            margin: '30px auto 0',
            background: T.red,
            borderRadius: 3,
            transform: `scaleX(${interpolate(f, [10 + words.length * 5, 22 + words.length * 5], [0, 1], { ...clamp, easing: out })})`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// a recorded phone screen standing on the right over the blurred campus, caption on the left
export const PhoneStage: React.FC<{
  clip: string;
  from?: number;
  dur: number;
  text: string;
  sub?: string;
  bg?: string;
  enter?: boolean; // false: the phone is already on screen (continues from the previous phone shot)
}> = ({ clip, from = 0, dur, text, sub, bg = 'b07_phone', enter = true }) => {
  const f = useCurrentFrame();
  const H = 900,
    W = Math.round((H * 600) / 1260);
  const y = enter ? interpolate(f, [0, 12], [60, 0], { ...clamp, easing: out }) : 0;
  const op = enter ? interpolate(f, [0, 8], [0, 1], clamp) : 1;
  const t = interpolate(f, [6, 18], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill
        style={{ filter: 'blur(22px) brightness(.45) saturate(1.15)', transform: 'scale(1.1)' }}
      >
        <Clip name={bg} from={0} rate={0.3} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          right: 260,
          top: (1080 - H) / 2,
          width: W,
          height: H,
          borderRadius: 54,
          overflow: 'hidden',
          transform: `translateY(${y}px)`,
          opacity: op,
          boxShadow: '0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        <OffthreadVideo
          src={staticFile(`clips/${clip}.mp4`)}
          startFrom={from}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 0,
          bottom: 0,
          width: 900,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          fontFamily: T.font,
          opacity: t,
          transform: `translateX(${(1 - t) * -30}px)`,
        }}
      >
        <div
          style={{ width: 90, height: 8, background: T.accent, borderRadius: 4, marginBottom: 28 }}
        />
        <div
          style={{
            fontSize: 66,
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.25,
            letterSpacing: 2,
          }}
        >
          {text}
        </div>
        {sub ? (
          <div
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: T.accent,
              marginTop: 20,
              letterSpacing: 2,
              lineHeight: 1.4,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// the crash film: plays, freezes on the crash with a ring around 吱吱, then thaws (speed-ramp-freeze · freeze-annotate)
export const FilmFreeze: React.FC<{ from: number; at: number; hold: number; dur: number }> = ({
  from,
  at,
  hold,
  dur,
}) => {
  const f = useCurrentFrame();
  const frozen = f >= at && f < at + hold;
  const k = f - at;
  const ring = interpolate(k, [0, 10], [0, 1], { ...clamp, easing: out });
  const flash = interpolate(k, [0, 2, 8], [0, 0.85, 0], clamp);
  const label = interpolate(k, [8, 16], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence durationInFrames={at}>
        <Clip name="z_film" from={from} />
      </Sequence>
      <Sequence from={at} durationInFrames={hold}>
        <Freeze frame={0}>
          <Clip name="z_film" from={from + at} />
        </Freeze>
      </Sequence>
      <Sequence from={at + hold} durationInFrames={dur - at - hold}>
        <Clip name="z_film" from={from + at} />
      </Sequence>
      {frozen ? (
        <>
          <AbsoluteFill style={{ background: 'rgba(0,0,0,.28)' }} />
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <circle
              cx={905}
              cy={420}
              r={118}
              fill="none"
              stroke={T.accent}
              strokeWidth={8}
              strokeDasharray={2 * Math.PI * 118}
              strokeDashoffset={2 * Math.PI * 118 * (1 - ring)}
              transform="rotate(-90 905 420)"
            />
            <line
              x1={1000}
              y1={340}
              x2={1150}
              y2={250}
              stroke={T.accent}
              strokeWidth={5}
              opacity={label}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              left: 1160,
              top: 196,
              opacity: label,
              fontFamily: T.font,
              fontSize: 46,
              fontWeight: 900,
              color: T.ink,
              background: T.accent,
              padding: '8px 24px',
              borderRadius: 10,
              letterSpacing: 2,
            }}
          >
            吱吱 · 衝出彎道
          </div>
          <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

// the bath mini-game: the card over the blurred bathroom, a big night counter that slams in (impact-feedback · hit-counter)
export const BathNight: React.FC<{ clip: string; from: number; night: number; dur: number }> = ({
  clip,
  from,
  night,
  dur,
}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 6], [1.6, 1], { ...clamp, easing: snap });
  const op = interpolate(f, [0, 4], [0, 1], clamp);
  const shake = f < 8 ? Math.sin(f * 2.4) * (8 - f) * 0.9 : 0;
  const H = 860,
    W = Math.round((H * 1120) / 1160);
  const done = night === 10;
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill style={{ filter: 'blur(24px) brightness(.4)', transform: 'scale(1.12)' }}>
        <Clip name="z_bath3d" from={20} rate={0.3} />
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: (1080 - H) / 2,
          width: W,
          height: H,
          borderRadius: 28,
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.6)',
        }}
      >
        <OffthreadVideo
          src={staticFile(`clips/${clip}.mp4`)}
          startFrom={from}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1240,
          top: 300,
          fontFamily: T.font,
          transform: `scale(${s}) translateX(${shake}px)`,
          transformOrigin: '30% 50%',
          opacity: op,
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: T.muted, letterSpacing: 6 }}>
          第 {night} 晚
        </div>
        <div style={{ fontWeight: 900, color: done ? T.accent : '#fff', lineHeight: 1 }}>
          <span style={{ fontSize: 220 }}>{night}</span>
          <span style={{ fontSize: 90, color: T.muted }}> / 10</span>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 1240,
          top: 640,
          width: 560,
          fontFamily: T.font,
          fontSize: 40,
          fontWeight: 800,
          color: '#fff',
          lineHeight: 1.4,
          opacity: interpolate(f, [6, 14, dur - 4, dur], [0, 1, 1, 1], clamp),
        }}
      >
        每晚 8 點，幫他洗殘廢澡
        <div style={{ fontSize: 28, fontWeight: 600, color: T.accent, marginTop: 12 }}>
          🧼 上肥皂、🪣 潑水，千萬別潑到石膏
        </div>
      </div>
    </AbsoluteFill>
  );
};

// a single clean sheen across the frame (light-play-moves · sheen-sweep): one pass, no glow spam
export const Sheen: React.FC<{ at: number; dur?: number }> = ({ at, dur = 18 }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [at, at + dur], [-700, 2300], { ...clamp, easing: out });
  const op = interpolate(f, [at, at + 4, at + dur - 4, at + dur], [0, 0.55, 0.55, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen', opacity: op }}>
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: x,
          width: 260,
          height: 1500,
          transform: 'rotate(18deg)',
          background:
            'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.85), rgba(255,255,255,0))',
          filter: 'blur(8px)',
        }}
      />
    </AbsoluteFill>
  );
};

// a browser window frame around a wiki recording or still
export const Browser: React.FC<{ url: string; children: React.ReactNode; w: number }> = ({
  url,
  children,
  w,
}) => {
  const h = Math.round((w * 9) / 16);
  return (
    <div
      style={{
        width: w,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,.55)',
        background: '#fff',
      }}
    >
      <div
        style={{
          height: 52,
          background: '#eceef2',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 18px',
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
        ))}
        <span
          style={{
            marginLeft: 18,
            flex: 1,
            height: 32,
            borderRadius: 16,
            background: '#fff',
            fontFamily: T.font,
            fontSize: 20,
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
          }}
        >
          🔒 {url}
        </span>
      </div>
      <div style={{ width: w, height: h, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

// wiki pages on a tilted wall scrolling in opposite directions (page-waterfall-wall), then the 吱吱 page comes forward
export const WikiWall: React.FC<{ dur: number; lockAt: number }> = ({ dur, lockAt }) => {
  const f = useCurrentFrame();
  const cols = [
    ['characters_0', 'characters_1', 'characters_2', 'shops_0', 'shops_1'],
    ['main-quests_0', 'main-quests_1', 'main-quests_2', 'cases_0', 'cases_1'],
    ['side-quests_0', 'shops_2', 'controls_0', 'controls_1', 'controls_2'],
  ];
  const cw = 560,
    ch = Math.round((cw * 9) / 16),
    gap = 26;
  const push = interpolate(f, [0, lockAt], [1, 1.08], clamp);
  const wallOut = interpolate(f, [lockAt, lockAt + 14], [1, 0], clamp);
  const fr = interpolate(f, [lockAt, lockAt + 18], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(1400px 800px at 50% 40%, #2a2f55 0%, ${T.ink} 70%)` }}
    >
      <AbsoluteFill style={{ perspective: 1600, opacity: wallOut }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%,-50%) rotateX(24deg) rotateZ(-8deg) scale(${push})`,
            display: 'flex',
            gap,
          }}
        >
          {cols.map((c, i) => {
            const dir = i % 2 ? 1 : -1;
            const loop = c.length * (ch + gap);
            const off = (((f * (2.4 + i * 0.5) * dir) % loop) + loop) % loop;
            return (
              <div key={i} style={{ height: 1400, overflow: 'hidden', width: cw }}>
                <div style={{ transform: `translateY(${-off}px)` }}>
                  {[...c, ...c].map((s, j) => (
                    <Img
                      key={j}
                      src={staticFile(`stills/${s}.jpg`)}
                      style={{
                        width: cw,
                        height: ch,
                        objectFit: 'cover',
                        objectPosition: '50% 0%',
                        display: 'block',
                        marginBottom: gap,
                        borderRadius: 12,
                        boxShadow: '0 12px 30px rgba(0,0,0,.4)',
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 150,
          background:
            'linear-gradient(rgba(13,16,32,.92), rgba(13,16,32,.75) 70%, rgba(13,16,32,0))',
        }}
      />
      <Heading
        text="人物、任務、商店、攻略，一次查清楚"
        sub="還有 SQL 偵探案件與操作教學"
        top={40}
      />
      {f >= lockAt ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 560,
            transform: `translate(-50%,-50%) scale(${0.85 + 0.15 * fr})`,
            opacity: fr,
          }}
        >
          <Browser url="yanlin-gta.com/wiki/side-quests/" w={1280}>
            <Img
              src={staticFile('stills/side-quests_0.jpg')}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${interpolate(f, [lockAt, dur], [1.0, 1.18], clamp)})`,
                transformOrigin: '50% 40%',
              }}
            />
          </Browser>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// a white URL pill at the bottom centre
export const UrlBar: React.FC<{ url: string; at?: number }> = ({ url, at = 8 }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 56 }}>
      <div
        style={{
          opacity: t,
          transform: `translateY(${(1 - t) * 20}px)`,
          fontFamily: T.font,
          fontSize: 40,
          fontWeight: 800,
          color: T.ink,
          background: '#fff',
          padding: '12px 36px',
          borderRadius: 999,
          letterSpacing: 1,
          boxShadow: '0 12px 30px rgba(0,0,0,.4)',
        }}
      >
        📖 {url}
      </div>
    </AbsoluteFill>
  );
};

// sign-off: title, slogan and both addresses, held to the end (R1)
export const EndCard3: React.FC = () => {
  const f = useCurrentFrame();
  const dim = interpolate(f, [0, 14], [0, 0.6], clamp);
  const s = interpolate(f, [4, 16], [1.2, 1], { ...clamp, easing: snap });
  const op = interpolate(f, [4, 10], [0, 1], clamp);
  const sub = interpolate(f, [14, 26], [0, 1], clamp);
  const u1 = interpolate(f, [22, 34], [0, 1], { ...clamp, easing: out });
  const u2 = interpolate(f, [28, 40], [0, 1], { ...clamp, easing: out });
  const pill = (txt: string, label: string, t: number, main: boolean) => (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        background: main ? T.accent : '#fff',
        color: T.ink,
        padding: '14px 34px',
        borderRadius: 999,
        boxShadow: '0 14px 34px rgba(0,0,0,.4)',
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 700, opacity: 0.75 }}>{label}</span>
      <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: 1 }}>{txt}</span>
    </div>
  );
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <AbsoluteFill style={{ background: T.ink, opacity: dim }} />
      <div style={{ textAlign: 'center', fontFamily: T.font }}>
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 12,
            transform: `scale(${s})`,
            opacity: op,
            textShadow: '0 8px 40px rgba(0,0,0,.5)',
          }}
        >
          中原順起來
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: T.accent,
            letterSpacing: 10,
            marginTop: 6,
            opacity: sub,
          }}
        >
          資管要贏　票投彥霖 ✌
        </div>
        <div
          style={{
            display: 'flex',
            gap: 30,
            justifyContent: 'center',
            marginTop: 52,
          }}
        >
          {pill('yanlin-gta.com', '🎮 遊戲', u1, true)}
          {pill('yanlin-gta.com/wiki', '📖 Wiki', u2, false)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// a breathing card over a blurred clip: kicker, headline, then two body lines fade up one after another
export const StoryCard: React.FC<{
  bg: string;
  bgFrom?: number;
  kicker: string;
  title: string;
  lines: string[];
  dur: number;
}> = ({ bg, bgFrom = 0, kicker, title, lines, dur }) => {
  const f = useCurrentFrame();
  const fade = interpolate(f, [0, 10, dur - 8, dur], [0, 1, 1, 0], clamp);
  const k = interpolate(f, [4, 14], [0, 1], clamp);
  const t = interpolate(f, [10, 22], [0, 1], { ...clamp, easing: out });
  const bar = interpolate(f, [16, 30], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill
        style={{ filter: 'blur(26px) brightness(.32) saturate(1.1)', transform: 'scale(1.12)' }}
      >
        <Clip name={bg} from={bgFrom} rate={0.5} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: T.font,
          opacity: fade,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 1500 }}>
          <div
            style={{
              display: 'inline-block',
              fontSize: 34,
              fontWeight: 800,
              color: T.ink,
              background: T.accent,
              padding: '8px 26px',
              borderRadius: 999,
              letterSpacing: 6,
              opacity: k,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: 3,
              marginTop: 30,
              opacity: t,
              transform: `translateY(${(1 - t) * 18}px)`,
              textShadow: '0 6px 30px rgba(0,0,0,.5)',
            }}
          >
            {title}
          </div>
          <div
            style={{
              height: 6,
              width: 140,
              margin: '30px auto 34px',
              background: T.red,
              borderRadius: 3,
              transform: `scaleX(${bar})`,
            }}
          />
          {lines.map((l, i) => {
            const a = interpolate(f, [26 + i * 16, 40 + i * 16], [0, 1], { ...clamp, easing: out });
            return (
              <div
                key={i}
                style={{
                  fontSize: 40,
                  fontWeight: 600,
                  color: i === 0 ? '#fff' : T.accent,
                  lineHeight: 1.6,
                  letterSpacing: 2,
                  opacity: a,
                  transform: `translateY(${(1 - a) * 14}px)`,
                }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
