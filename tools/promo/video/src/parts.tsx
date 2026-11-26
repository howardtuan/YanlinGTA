import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { T } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const out = Easing.bezier(0.16, 1, 0.3, 1);

// one recorded game clip; `from` = first source frame, `rate` = playback speed
export const Clip: React.FC<{
  name: string;
  from?: number;
  rate?: number;
  style?: React.CSSProperties;
  zoom?: [number, number]; // slow push: scale at start -> end of the sequence
  dur?: number;
  origin?: string;
}> = ({ name, from = 0, rate = 1, style, zoom, dur = 1, origin = '50% 50%' }) => {
  const f = useCurrentFrame();
  const s = zoom ? interpolate(f, [0, dur], zoom, clamp) : 1;
  return (
    <OffthreadVideo
      src={staticFile(`clips/${name}.mp4`)}
      startFrom={from}
      playbackRate={rate}
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: `scale(${s})`,
        transformOrigin: origin,
        ...style,
      }}
    />
  );
};

// lower-left caption: a yellow bar wipes in, then the line slides up; fades before the cut
export const Caption: React.FC<{
  text: string;
  sub?: string;
  dur: number;
  delay?: number;
  top?: boolean;
}> = ({ text, sub, dur, delay = 6, top = false }) => {
  const f = useCurrentFrame() - delay;
  const bar = interpolate(f, [0, 10], [0, 1], { ...clamp, easing: out });
  const up = interpolate(f, [4, 18], [24, 0], { ...clamp, easing: out });
  const op = interpolate(f, [4, 16, dur - delay - 8, dur - delay], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        justifyContent: top ? 'flex-start' : 'flex-end',
        alignItems: top ? 'flex-end' : 'flex-start',
        padding: top ? '120px 110px 0 0' : '0 0 96px 110px',
        opacity: op,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 22,
          ...(top
            ? {
                background: 'rgba(13,16,32,.86)',
                padding: '22px 34px 24px 26px',
                borderRadius: 16,
                boxShadow: '0 16px 40px rgba(0,0,0,.3)',
              }
            : {}),
        }}
      >
        <div
          style={{
            width: 10,
            background: T.accent,
            borderRadius: 3,
            transform: `scaleY(${bar})`,
            transformOrigin: 'bottom',
          }}
        />
        <div style={{ transform: `translateY(${up}px)` }}>
          <div
            style={{
              fontFamily: T.font,
              fontWeight: 800,
              fontSize: 62,
              color: '#fff',
              letterSpacing: 2,
              lineHeight: 1.15,
              textShadow: '0 3px 18px rgba(0,0,0,.55), 0 1px 3px rgba(0,0,0,.6)',
            }}
          >
            {text}
          </div>
          {sub ? (
            <div
              style={{
                fontFamily: T.font,
                fontWeight: 500,
                fontSize: 30,
                color: T.accent,
                marginTop: 10,
                letterSpacing: 3,
                textShadow: '0 2px 10px rgba(0,0,0,.6)',
              }}
            >
              {sub}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// a small name tag (shop names over the store-front cuts)
export const Tag: React.FC<{ text: string; dur: number }> = ({ text, dur }) => {
  const f = useCurrentFrame();
  const x = interpolate(f, [0, 10], [-40, 0], { ...clamp, easing: out });
  const op = interpolate(f, [0, 8, dur - 5, dur], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 80 }}>
      <div
        style={{
          opacity: op,
          transform: `translateX(${x}px)`,
          fontFamily: T.font,
          fontWeight: 700,
          fontSize: 40,
          color: T.ink,
          background: T.accent,
          padding: '10px 26px',
          borderRadius: 10,
          letterSpacing: 2,
          boxShadow: '0 8px 28px rgba(0,0,0,.35)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// short whip: horizontal smear + slide, laid over the last / first frames of two clips
export const Whip: React.FC<{ dir?: 1 | -1 }> = ({ dir = 1 }) => {
  const f = useCurrentFrame();
  const a = interpolate(f, [0, 4, 8], [0, 1, 0], clamp);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${dir > 0 ? 90 : 270}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 50%, rgba(255,255,255,0) 100%)`,
        opacity: a,
        transform: `translateX(${interpolate(f, [0, 8], [-600 * dir, 600 * dir])}px)`,
        filter: 'blur(30px)',
      }}
    />
  );
};

export const Fade: React.FC<{ dur: number; color?: string; inOut?: 'in' | 'out' }> = ({
  dur,
  color = '#000',
  inOut = 'in',
}) => {
  const f = useCurrentFrame();
  const o =
    inOut === 'in'
      ? interpolate(f, [0, dur], [1, 0], clamp)
      : interpolate(f, [0, dur], [0, 1], clamp);
  return <AbsoluteFill style={{ background: color, opacity: o }} />;
};

export const Seq = Sequence;
