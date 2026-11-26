import React from 'react';
import { AbsoluteFill, Audio, interpolate, Loop, Sequence, staticFile } from 'remotion';
import { Caption, Clip, Fade, Tag, Whip } from './parts';
import { EndCard, PcGrid, PhoneGrid, Platforms, TitleCard } from './scenes';

// ---- timeline (30 fps). Each entry: [start, duration] -------------------------------------------
export const S = {
  gate: [0, 120],
  tower: [120, 90],
  gordon: [210, 30],
  massage: [240, 30],
  tea: [270, 30],
  ride: [300, 90],
  street: [390, 60],
  title: [450, 75],
  phone: [525, 90],
  phoneGrid: [615, 240],
  heliIn: [855, 30],
  pilot: [885, 30],
  landed: [915, 30],
  lab: [945, 105],
  pcGrid: [1050, 240],
  hero: [1290, 150],
  platforms: [1440, 120],
  outro: [1560, 180],
} as const;
export const TOTAL = 1740;

const At: React.FC<{ s: readonly [number, number]; children: React.ReactNode; name?: string }> = ({
  s,
  children,
  name,
}) => (
  <Sequence from={s[0]} durationInFrames={s[1]} name={name}>
    {children}
  </Sequence>
);

// music bed: the game's own scene tracks, crossfaded per segment
const Bed: React.FC<{ file: string; from: number; dur: number; offset?: number; vol?: number }> = ({
  file,
  from,
  dur,
  offset = 0,
  vol = 0.55,
}) => (
  <Sequence from={from} durationInFrames={dur} name={`bgm ${file}`}>
    <Audio
      src={staticFile(`audio/${file}`)}
      startFrom={offset}
      volume={(f) =>
        interpolate(f, [0, 18, dur - 24, dur], [0, vol, vol, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  </Sequence>
);
const Sfx: React.FC<{ file: string; at: number; vol?: number; dur?: number; loop?: number }> = ({
  file,
  at,
  vol = 0.6,
  dur = 120,
  loop,
}) => (
  <Sequence from={at} durationInFrames={dur} name={`sfx ${file}`}>
    {loop ? (
      <Loop durationInFrames={loop}>
        <Audio src={staticFile(`audio/${file}`)} volume={vol} />
      </Loop>
    ) : (
      <Audio src={staticFile(`audio/${file}`)} volume={vol} />
    )}
  </Sequence>
);
const Fadeable: React.FC<{ file: string; at: number; dur: number; vol: number; loop: number }> = ({
  file,
  at,
  dur,
  vol,
  loop,
}) => (
  <Sequence from={at} durationInFrames={dur} name={`amb ${file}`}>
    <Loop durationInFrames={loop}>
      <Audio src={staticFile(`audio/${file}`)} volume={vol} />
    </Loop>
  </Sequence>
);

export const Promo: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* ---------------- A: first-person campus ---------------- */}
      <At s={S.gate} name="01 校門進場">
        <Clip name="a01_gate" from={0} />
        <Caption
          text="真實的中原大學，1:1 搬進遊戲"
          sub="OpenStreetMap 真實地圖 × 3D 開放世界"
          dur={S.gate[1]}
          delay={18}
        />
        <Fade dur={14} />
      </At>
      <At s={S.tower} name="02 鐘塔">
        <Clip name="a02_tower" from={20} />
        <Caption text="走過大草坪，抬頭就是二一鐘塔" dur={S.tower[1]} delay={4} />
      </At>
      <At s={S.gordon} name="03 戈登肉鋪">
        <Clip name="a03_gordon" from={10} />
        <Tag text="戈登肉鋪" dur={30} />
      </At>
      <At s={S.massage} name="03 涼韌足體">
        <Clip name="a03_massage" from={8} />
        <Tag text="涼韌足體養生" dur={30} />
      </At>
      <At s={S.tea} name="03 茶學苑">
        <Clip name="a03_tea" from={8} />
        <Tag text="茶學苑手搖飲" dur={30} />
      </At>
      <At s={S.ride} name="04 新中北路">
        <Clip name="a04_ride" from={30} />
        <Caption text="騎上 JET SL，衝出新中北路" dur={S.ride[1]} delay={4} />
      </At>
      <Sequence from={S.ride[0] + S.ride[1] - 4} durationInFrames={9} name="whip">
        <Whip />
      </Sequence>
      <At s={S.street} name="05 日夜">
        <Clip name="a05_street" from={0} rate={1.5} />
        <Caption
          text="從白天到夜晚，每個人都在過日子"
          sub="24 小時作息 · NPC 有自己的生活"
          dur={S.street[1]}
          delay={2}
        />
      </At>
      <At s={S.title} name="06 主標題">
        <Clip name="a06_aerial" from={0} zoom={[1.0, 1.04]} dur={S.title[1]} />
        <TitleCard />
      </At>

      {/* ---------------- B: phone ---------------- */}
      <At s={S.phone} name="07 手機登場">
        <Clip name="b07_phone" from={12} zoom={[1, 1.06]} dur={S.phone[1]} origin="80% 50%" />
        <Caption text="掏出手機，校園生活全在裡面" dur={S.phone[1]} delay={14} />
      </At>
      <At s={S.phoneGrid} name="08 手機六宮格">
        <PhoneGrid dur={S.phoneGrid[1]} />
      </At>
      <At s={S.heliIn} name="09 機師特寫">
        <Clip name="b09_airdrop" from={112} />
        <Caption text="手機一按，直升機真的把機車空投過來" dur={90} delay={2} />
      </At>
      <At s={S.pilot} name="09 直升機吊掛">
        <Clip name="b09_airdrop" from={140} />
      </At>
      <At s={S.landed} name="09 機車落地">
        <Clip name="b09_airdrop" from={222} />
      </At>

      {/* ---------------- C: computer ---------------- */}
      <At s={S.lab} name="10 電腦教室">
        <Sequence durationInFrames={80}>
          <Clip name="c10_lab" from={0} rate={1.2} />
        </Sequence>
        <Sequence from={80} durationInFrames={25}>
          <Clip name="c10_desk" from={28} zoom={[1.12, 1]} dur={25} />
          <Fade dur={8} color="#fff" />
        </Sequence>
        <Caption text="走進資管系館電腦教室" sub="坐下、開機" dur={80} delay={8} />
      </At>
      <At s={S.pcGrid} name="11 電腦六宮格">
        <PcGrid dur={S.pcGrid[1]} />
      </At>
      <At s={S.hero} name="12 程式真的會跑">
        <Clip name="c12_hero" from={8} zoom={[1.05, 1.32]} dur={S.hero[1]} origin="20% 92%" />
        <Caption
          text="Python、MySQL、AI Agent"
          sub="真的寫、真的跑、自動批改"
          dur={S.hero[1]}
          delay={10}
          top
        />
      </At>

      {/* ---------------- D: sign-off ---------------- */}
      <At s={S.platforms} name="13 平台">
        <Platforms dur={S.platforms[1]} />
      </At>
      <At s={S.outro} name="14 收場">
        <Clip name="d14_outro" from={0} rate={0.92} />
        <Sequence from={100}>
          <EndCard />
        </Sequence>
      </At>
      <Sequence from={TOTAL - 10} durationInFrames={10}>
        <Fade dur={10} inOut="out" />
      </Sequence>

      {/* ---------------- sound ---------------- */}
      {bgm ? (
        <>
          <Bed file="scene-day.m4a" from={0} dur={S.phone[0] + 12} offset={60} />
          <Bed file="scene-timed.m4a" from={S.phone[0] - 12} dur={S.lab[0] - S.phone[0] + 24} />
          <Bed
            file="scene-night.m4a"
            from={S.lab[0] - 12}
            dur={S.platforms[0] - S.lab[0] + 24}
            offset={120}
            vol={0.7}
          />
          <Bed
            file="scene-ending.m4a"
            from={S.platforms[0] - 12}
            dur={TOTAL - S.platforms[0] + 12}
            vol={0.5}
          />
        </>
      ) : null}
      <Fadeable file="amb_day.m4a" at={0} dur={S.ride[0]} vol={0.3} loop={450} />
      {Array.from({ length: 12 }, (_, k) => (
        <Sfx key={k} file="step_grass.m4a" at={8 + k * 17} vol={0.22} dur={12} />
      ))}
      <Sfx file="clock_chime.m4a" at={S.tower[0] + 30} vol={0.45} dur={135} />
      <Sfx file="engine_scooter.m4a" at={S.ride[0]} vol={0.5} dur={S.ride[1] + 4} loop={64} />
      <Fadeable file="amb_night.m4a" at={S.street[0]} dur={S.street[1]} vol={0.3} loop={450} />
      <Sfx file="thud.m4a" at={S.title[0] + 9} vol={0.8} dur={24} />
      <Sfx file="ding.m4a" at={S.phone[0] + 12} vol={0.5} dur={75} />
      <Sfx file="heli.m4a" at={S.heliIn[0]} vol={0.55} dur={60} loop={64} />
      <Sfx file="land.m4a" at={S.landed[0] + 4} vol={0.8} dur={12} />
      <Sfx file="ding.m4a" at={S.hero[0] + 100} vol={0.55} dur={75} />
      <Sfx file="cheer.m4a" at={S.outro[0] + 70} vol={0.35} dur={108} />
      <Sfx file="thud.m4a" at={S.outro[0] + 104} vol={0.8} dur={24} />
    </AbsoluteFill>
  );
};
