import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Clip } from './parts';
import { T } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);

const Heading: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [2, 14], [0, 1], clamp);
  const y = interpolate(f, [2, 18], [18, 0], { ...clamp, easing: out });
  return (
    <div
      style={{
        position: 'absolute',
        top: 54,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: op,
        transform: `translateY(${y}px)`,
        fontFamily: T.font,
      }}
    >
      <span style={{ fontSize: 54, fontWeight: 800, color: '#fff', letterSpacing: 3 }}>{text}</span>
      {sub ? (
        <span
          style={{
            fontSize: 30,
            fontWeight: 500,
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

const Label: React.FC<{ text: string; on: boolean }> = ({ text, on }) => (
  <div
    style={{
      fontFamily: T.font,
      fontSize: 27,
      fontWeight: 700,
      letterSpacing: 1,
      padding: '6px 18px',
      borderRadius: 999,
      color: on ? T.ink : '#fff',
      background: on ? T.accent : 'rgba(13,16,32,.62)',
      border: `1.5px solid ${on ? T.accent : 'rgba(255,255,255,.25)'}`,
      whiteSpace: 'nowrap',
    }}
  >
    {text}
  </div>
);

// six phones in a row ("橫向六宮格"), each playing its own recorded app session; one is in focus at a time
export const PhoneGrid: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const apps: { clip: string; name: string; rate?: number }[] = [
    { clip: 'p_garage', name: '呼叫載具', rate: 0.62 },
    { clip: 'p_stock', name: '靈感股' },
    { clip: 'p_gram', name: 'Peachgram' },
    { clip: 'p_burger', name: '漢堡車' },
    { clip: 'p_news', name: 'PYtoday' },
    { clip: 'p_msg', name: '訊息' },
  ];
  const H = 640,
    W = Math.round((H * 600) / 1260),
    gap = 16;
  const total = apps.length * W + (apps.length - 1) * gap;
  const slot = (dur - 30) / apps.length;
  return (
    <AbsoluteFill style={{ background: T.ink }}>
      <AbsoluteFill
        style={{ filter: 'blur(26px) brightness(.45) saturate(1.2)', transform: 'scale(1.1)' }}
      >
        <Clip name="b07_phone" from={0} rate={0.4} />
      </AbsoluteFill>
      <Heading text="手機裡，有一整個校園" sub="25 個 APP 都能真的用" />
      {apps.map((a, k) => {
        // deal in from below, faster and faster (R2), then settle
        const t0 = Math.round(k * 4.2 - k * k * 0.25);
        const y = interpolate(f, [t0, t0 + 14], [700, 0], { ...clamp, easing: out });
        const active = Math.floor((f - 20) / slot) === k && f >= 20 && f < dur - 10;
        const s = interpolate(
          f,
          [20 + k * slot, 20 + k * slot + 8, 20 + (k + 1) * slot - 6, 20 + (k + 1) * slot],
          [1, 1.06, 1.06, 1],
          clamp
        );
        const x = (1920 - total) / 2 + k * (W + gap);
        return (
          <div
            key={a.clip}
            style={{
              position: 'absolute',
              left: x,
              top: 178,
              width: W,
              transform: `translateY(${y}px) scale(${s})`,
              transformOrigin: '50% 50%',
              zIndex: active ? 2 : 1,
            }}
          >
            <div
              style={{
                width: W,
                height: H,
                borderRadius: 44,
                overflow: 'hidden',
                boxShadow: active
                  ? `0 0 0 4px ${T.accent}, 0 24px 60px rgba(0,0,0,.6)`
                  : '0 18px 44px rgba(0,0,0,.5)',
                filter: active || f < 20 || f >= dur - 10 ? 'none' : 'brightness(.72)',
              }}
            >
              <OffthreadVideo
                src={staticFile(`clips/${a.clip}.mp4`)}
                playbackRate={a.rate || 1}
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
              <Label text={a.name} on={active} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// 3 x 2 grid of the computer apps (each cell zooms to where the action is)
export const PcGrid: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const cells: {
    clip: string;
    name: string;
    rate?: number;
    zoom?: number;
    origin?: string;
    from?: number;
  }[] = [
    { clip: 'c_sql', name: '資管學堂 · MySQL', zoom: 1.25, origin: '62% 62%' },
    { clip: 'c_term', name: '終端機 · SQL 偵探', zoom: 1.55, origin: '0% 0%' },
    { clip: 'c_leet', name: 'Two Sum 一鍵通關', zoom: 1.2, origin: '50% 45%' },
    { clip: 'c_paint', name: '小畫家', zoom: 1.15, origin: '40% 45%', rate: 0.85 },
    { clip: 'c_mines', name: '踩地雷', zoom: 1.05, origin: '50% 50%' },
    { clip: 'c_stats', name: '競選後台', zoom: 1.9, origin: '0% 8%', rate: 0.5 },
  ];
  const CW = 584,
    CH = Math.round((CW * 9) / 16),
    gx = 26,
    gy = 70;
  const x0 = (1920 - (3 * CW + 2 * gx)) / 2,
    y0 = 168;
  const slot = (dur - 30) / cells.length;
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(1200px 700px at 50% 40%, #1b2140 0%, ${T.ink} 70%)` }}
    >
      <Heading text="遊戲裡，再開一台真的電腦" sub="程式現寫現跑、自動批改" />
      {cells.map((c, k) => {
        const col = k % 3,
          row = Math.floor(k / 3);
        const t0 = Math.round(k * 3.6 - k * k * 0.2);
        const op = interpolate(f, [t0, t0 + 10], [0, 1], clamp);
        const sc = interpolate(f, [t0, t0 + 14], [0.86, 1], { ...clamp, easing: out });
        const active = Math.floor((f - 20) / slot) === k && f >= 20 && f < dur - 10;
        return (
          <div
            key={c.clip}
            style={{
              position: 'absolute',
              left: x0 + col * (CW + gx),
              top: y0 + row * (CH + gy),
              width: CW,
              opacity: op,
              transform: `scale(${sc * (active ? 1.035 : 1)})`,
              zIndex: active ? 2 : 1,
            }}
          >
            <div
              style={{
                width: CW,
                height: CH,
                borderRadius: 14,
                overflow: 'hidden',
                background: '#000',
                boxShadow: active
                  ? `0 0 0 4px ${T.accent}, 0 22px 50px rgba(0,0,0,.55)`
                  : '0 14px 36px rgba(0,0,0,.45)',
                filter: active || f < 20 || f >= dur - 10 ? 'none' : 'brightness(.75)',
              }}
            >
              <OffthreadVideo
                src={staticFile(`clips/${c.clip}.mp4`)}
                playbackRate={c.rate || 1}
                startFrom={c.from || 0}
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: `scale(${c.zoom || 1})`,
                  transformOrigin: c.origin || '50% 50%',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
              <Label text={c.name} on={active} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// game title over the aerial: stamps in, then holds (R1)
export const TitleCard: React.FC = () => {
  const f = useCurrentFrame();
  const s = interpolate(f, [8, 20], [1.25, 1], {
    ...clamp,
    easing: Easing.bezier(0.2, 1.4, 0.4, 1),
  });
  const op = interpolate(f, [8, 14], [0, 1], clamp);
  const bar = interpolate(f, [18, 30], [0, 1], { ...clamp, easing: out });
  const sub = interpolate(f, [24, 36], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(900px 420px at 50% 52%, rgba(13,16,32,.62) 0%, rgba(13,16,32,.15) 70%, rgba(13,16,32,0) 100%)',
          opacity: op,
        }}
      />
      <div style={{ textAlign: 'center', fontFamily: T.font }}>
        <div
          style={{
            fontSize: 168,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 14,
            transform: `scale(${s})`,
            opacity: op,
            textShadow: '0 8px 40px rgba(0,0,0,.55), 0 2px 0 rgba(0,0,0,.25)',
          }}
        >
          中原順起來
        </div>
        <div
          style={{
            height: 10,
            width: 560,
            margin: '6px auto 26px',
            background: `linear-gradient(90deg, ${T.accent}, ${T.red})`,
            borderRadius: 5,
            transform: `scaleX(${bar})`,
          }}
        />
        <div
          style={{
            fontSize: 58,
            fontWeight: 700,
            color: T.accent,
            letterSpacing: 8,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 14}px)`,
            textShadow: '0 4px 20px rgba(0,0,0,.6)',
          }}
        >
          資管要贏 · 票投彥霖
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Laptop: React.FC<{ children: React.ReactNode; w: number }> = ({ children, w }) => {
  const h = Math.round((w * 9) / 16);
  return (
    <div style={{ width: w + 60 }}>
      <div
        style={{
          background: '#16181f',
          borderRadius: 22,
          padding: 26,
          paddingBottom: 30,
          boxShadow: '0 30px 70px rgba(0,0,0,.55)',
        }}
      >
        <div style={{ width: w, height: h, borderRadius: 6, overflow: 'hidden' }}>{children}</div>
      </div>
      <div
        style={{
          height: 22,
          margin: '0 -50px',
          background: 'linear-gradient(#cfd2d8,#8d9099)',
          borderRadius: '0 0 26px 26px',
        }}
      />
    </div>
  );
};
const PhoneL: React.FC<{ children: React.ReactNode; w: number }> = ({ children, w }) => {
  const h = Math.round((w * 390) / 844);
  return (
    <div
      style={{
        background: '#0b0c10',
        borderRadius: 46,
        padding: 16,
        boxShadow: '0 30px 70px rgba(0,0,0,.55), inset 0 0 0 2px #2a2d36',
      }}
    >
      <div style={{ width: w, height: h, borderRadius: 32, overflow: 'hidden' }}>{children}</div>
    </div>
  );
};

// desktop + phone side by side
export const Platforms: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const l = interpolate(f, [0, 16], [-120, 0], { ...clamp, easing: out });
  const r = interpolate(f, [4, 20], [120, 0], { ...clamp, easing: out });
  const op = interpolate(f, [0, 12, dur - 8, dur], [0, 1, 1, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1300px 760px at 50% 45%, #232a52 0%, ${T.ink} 72%)`,
        opacity: op,
      }}
    >
      <Heading text="免安裝，打開瀏覽器就能玩" sub="電腦 · 手機 · 手把都支援" />
      <div style={{ position: 'absolute', left: 120, top: 250, transform: `translateX(${l}px)` }}>
        <Laptop w={900}>
          <Clip name="a04_ride" from={36} />
        </Laptop>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 34 }}>
          <Label text="電腦：WASD + 滑鼠" on={false} />
        </div>
      </div>
      <div style={{ position: 'absolute', right: 110, top: 330, transform: `translateX(${r}px)` }}>
        <PhoneL w={680}>
          <Clip name="d13_mobile" from={36} />
        </PhoneL>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 34 }}>
          <Label text="手機：虛擬搖桿觸控" on={false} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// sign-off: darkens the pull-back and stamps the title + address, held to the end (R1)
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const dim = interpolate(f, [0, 14], [0, 0.55], clamp);
  const s = interpolate(f, [4, 16], [1.2, 1], {
    ...clamp,
    easing: Easing.bezier(0.2, 1.4, 0.4, 1),
  });
  const op = interpolate(f, [4, 10], [0, 1], clamp);
  const sub = interpolate(f, [14, 26], [0, 1], clamp);
  const url = interpolate(f, [22, 34], [0, 1], clamp);
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
            fontSize: 66,
            fontWeight: 800,
            color: T.accent,
            letterSpacing: 10,
            marginTop: 8,
            opacity: sub,
          }}
        >
          資管要贏　票投彥霖 ✌
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 46,
            opacity: url,
            transform: `translateY(${(1 - url) * 12}px)`,
            fontSize: 38,
            fontWeight: 600,
            color: T.ink,
            background: '#fff',
            padding: '14px 34px',
            borderRadius: 999,
            letterSpacing: 1,
          }}
        >
          howardtuan.github.io/YanlinGTA
        </div>
      </div>
    </AbsoluteFill>
  );
};
