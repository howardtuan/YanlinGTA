// v3 promo, 1:58 at 30 fps. Storyboard: campus tour -> streets around campus -> phone -> computer ->
// the hidden side quest (吱吱武嶺跑山受傷: why, the crash film, the baths, the reward) -> the wiki -> both addresses.
// Music is only the game's own scene tracks (情境音樂); sound effects come from assets/sfx.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, Loop, Sequence, staticFile } from 'remotion';
import { Caption, Clip, Fade, Whip } from './parts';
import { Platforms, TitleCard } from './scenes';
import {
  Browser,
  StoryCard,
  EndCard3,
  LandGrid,
  MapTour,
  PhoneRow,
  PhoneStage,
  UrlBar,
  WikiWall,
} from './scenes3';
import { T } from './theme';

// [start, duration] in frames
export const S3 = {
  gate: [0, 150],
  tower: [150, 90],
  tour: [240, 240],
  crane: [480, 90],
  title: [570, 90],
  ride: [660, 120],
  area: [780, 240],
  street: [1020, 120],
  phone: [1140, 90],
  phoneGrid: [1230, 240],
  drone: [1470, 160],
  lab: [1630, 90],
  pcGrid: [1720, 240],
  hero: [1960, 150],
  npcs: [2110, 150],
  quests: [2260, 240],
  wiki: [2500, 90],
  wall: [2590, 180],
  platforms: [2770, 90],
  outro: [2860, 150],
} as const;
export const TOTAL3 = 3010;

const At: React.FC<{ s: readonly [number, number]; children: React.ReactNode; name?: string }> = ({
  s,
  children,
  name,
}) => (
  <Sequence from={s[0]} durationInFrames={s[1]} name={name}>
    {children}
  </Sequence>
);

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

export const Promo3: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* ① campus tour */}
      <At s={S3.gate} name="01 校門進場">
        <Clip name="a01_gate" from={0} />
        <Caption
          text="真實的中原大學，1:1 搬進遊戲"
          sub="OpenStreetMap 真實地圖 × 3D 開放世界"
          dur={S3.gate[1]}
          delay={18}
        />
        <Fade dur={14} />
      </At>
      <At s={S3.tower} name="02 鐘塔">
        <Clip name="a02_tower" from={20} />
        <Caption text="走過大草坪，抬頭就是二一鐘塔" dur={S3.tower[1]} delay={4} />
      </At>
      <At s={S3.tour} name="03 校園導覽">
        <MapTour
          mapDur={84}
          cut={39}
          stops={[
            { clip: 'a03_lawn', name: '中原大學大草坪', sub: '傍晚的鐘塔' },
            { clip: 'a03_gym', name: '中原大學體育館' },
            { clip: 'a03_dept', from: 25, name: '資訊管理學系' },
            { clip: 'a03_weiche', name: '維澈樓' },
          ]}
        />
      </At>
      <At s={S3.crane} name="04 升起">
        <Clip name="a04_crane" from={14} />
      </At>
      <At s={S3.title} name="05 主標題">
        <Clip name="a06_aerial" from={0} zoom={[1.0, 1.04]} dur={S3.title[1]} />
        <TitleCard />
      </At>

      {/* ② the streets around campus */}
      <At s={S3.ride} name="06 新中北路">
        <Clip name="a04_ride" from={10} />
        <Caption
          text="騎上機車，衝出校門"
          sub="學校周邊，吃喝玩樂都能逛"
          dur={S3.ride[1]}
          delay={4}
        />
      </At>
      <Sequence from={S3.ride[0] + S3.ride[1] - 4} durationInFrames={9} name="whip">
        <Whip />
      </Sequence>
      <At s={S3.area} name="07 周邊六宮格">
        <LandGrid
          dur={S3.area[1]}
          title="學校周邊"
          sub="真的店、真的路，都能走進去"
          bg="a04_ride"
          bgFrom={40}
          tiles={[
            { clip: 't_gordon', name: '戈登肉鋪', desc: '和牛現切，買給女朋友' },
            { clip: 't_massage', name: '涼韌足體', desc: '指定師傅、調整力道' },
            { clip: 't_tea', name: '茶學苑', desc: '手搖飲，甜度冰塊自己選' },
            { clip: 't_mcd', name: '麥當勞', desc: '內場外場都能打工' },
            {
              clip: 't_cross',
              name: '夜市十字路口',
              desc: '小吃店一字排開，任務二來這採買',
              from: 10,
            },
            {
              clip: 't_train',
              name: '平交道',
              desc: '柵欄放下，區間車通過',
              from: 225,
              origin: '75% 50%',
              zoom: 1.35,
            },
          ]}
        />
      </At>
      <At s={S3.street} name="08 日夜">
        <Clip name="a05_street" from={0} />
        <Caption
          text="從白天到夜晚，每個人都在過日子"
          sub="24 小時日夜 · NPC 有自己的作息"
          dur={S3.street[1]}
          delay={4}
        />
      </At>

      {/* ③ phone */}
      <At s={S3.phone} name="09 手機登場">
        <Clip name="b07_phone" from={12} zoom={[1, 1.06]} dur={S3.phone[1]} origin="80% 50%" />
        <Caption text="掏出手機，校園生活全在裡面" dur={S3.phone[1]} delay={12} />
      </At>
      <At s={S3.phoneGrid} name="10 手機六宮格">
        <PhoneRow
          dur={S3.phoneGrid[1]}
          tiles={[
            { clip: 'p_news', name: 'PYtoday', desc: '校園新聞' },
            { clip: 'p_gram', name: 'Peachgram', desc: '限動、按讚' },
            { clip: 'p_stock', name: '靈感股', desc: '買彥霖好帥股' },
            { clip: 'p_mcd', name: '麥當勞', desc: '打工排班' },
            { clip: 'p_shop', name: '桃寶購物', desc: '網購送到家' },
            { clip: 'p_tix', name: '皮元系統', desc: '演唱會搶票' },
          ]}
        />
      </At>
      <At s={S3.drone} name="11 無人機">
        <Sequence durationInFrames={40}>
          <PhoneStage
            clip="p_drone"
            from={10}
            dur={40}
            text="手機連上無人機"
            sub="戴上 VR 眼鏡就起飛"
          />
        </Sequence>
        <Sequence from={40} durationInFrames={120}>
          <Clip name="d_drone" from={30} rate={1.12} />
          <Caption text="整個中原，盡收眼底" sub="無人機 · 高空俯瞰" dur={120} delay={40} top />
        </Sequence>
      </At>

      {/* ④ computer */}
      <At s={S3.lab} name="12 電腦教室">
        <Sequence durationInFrames={66}>
          <Clip name="c10_lab" from={0} rate={1.3} />
        </Sequence>
        <Sequence from={66} durationInFrames={24}>
          <Clip name="c10_desk" from={26} zoom={[1.12, 1]} dur={24} />
          <Fade dur={8} color="#fff" />
        </Sequence>
        <Caption text="走進資管系館電腦教室" sub="坐下、開機" dur={66} delay={6} />
      </At>
      <At s={S3.pcGrid} name="13 電腦六宮格">
        <LandGrid
          dur={S3.pcGrid[1]}
          title="系館電腦，真的能用"
          sub="程式現寫現跑、自動批改"
          bg="c10_desk"
          tiles={[
            {
              clip: 'c_sql',
              name: 'MySQL 入門',
              desc: '寫 SQL 查資料',
              zoom: 1.25,
              origin: '62% 62%',
            },
            {
              clip: 'c_ai',
              name: 'AI Agent 入門',
              desc: '一步步做出 AI 助理',
              zoom: 1.2,
              origin: '50% 30%',
            },
            {
              clip: 'c_term',
              name: 'SQL 偵探',
              desc: '終端機查監視器破案',
              from: 40,
              zoom: 1.5,
              origin: '0% 0%',
            },
            {
              clip: 'c_leet',
              name: 'Two Sum',
              desc: 'LeetCode 一鍵通關',
              zoom: 1.2,
              origin: '50% 45%',
            },
            { clip: 'c_paint', name: '小畫家', desc: '畫一顆愛心', zoom: 1.15, origin: '40% 45%' },
            { clip: 'c_mines', name: '踩地雷', desc: '經典小遊戲', from: 20 },
          ]}
        />
      </At>
      <At s={S3.hero} name="14 程式真的會跑">
        <Clip name="c12_hero" from={8} zoom={[1.05, 1.32]} dur={S3.hero[1]} origin="20% 92%" />
        <Caption
          text="Python、MySQL、AI Agent"
          sub="真的寫、真的跑、自動批改"
          dur={S3.hero[1]}
          delay={10}
          top
        />
      </At>

      {/* ⑤ NPCs: talking to them can start a hidden side quest; a few examples */}
      <At s={S3.npcs} name="15 隱藏 NPC 任務彩蛋">
        <StoryCard
          bg="z_meet_zz"
          bgFrom={10}
          dur={S3.npcs[1]}
          kicker="隱藏 NPC 任務彩蛋"
          title="跟同學多聊幾句，說不定就觸發了"
          lines={[
            '每一段任務，都改編自彥霖和同學們真實發生過的事',
            '我們把大學時期的酸甜苦辣放進遊戲裡，想和你一起分享',
          ]}
        />
      </At>
      <At s={S3.quests} name="16 隱藏支線四宮格">
        <LandGrid
          dur={S3.quests[1]}
          cols={2}
          title="隱藏 NPC 任務"
          sub="一位同學，一段故事"
          bg="a03_lawn"
          tiles={[
            {
              clip: 'z_film',
              name: '吱吱｜武嶺跑山受傷',
              desc: '婉拒跑山邀約後，他在武嶺翻車了',
              from: 100,
              len: 315,
            },
            {
              clip: 'n_pinhan',
              name: '品漢堡｜幫他找一台車',
              desc: '找到車，他每天免費載你一程',
              len: 100,
            },
            {
              clip: 'n_jianyu',
              name: '劍玉｜班費失竊案',
              desc: '幫他抓出小偷，就借你開藍寶堅尼',
              len: 100,
            },
            {
              clip: 'n_howard',
              name: '霍華德｜LeetCode Two Sum',
              desc: '解完就借你騎重機',
              len: 100,
            },
          ]}
        />
      </At>

      {/* ⑥ wiki */}
      <At s={S3.wiki} name="24 Wiki 首頁">
        <AbsoluteFill
          style={{
            background: `radial-gradient(1400px 800px at 50% 40%, #2a2f55 0%, ${T.ink} 70%)`,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div style={{ marginTop: -150 }}>
            <Browser url="yanlin-gta.com/wiki" w={1180}>
              <Clip name="w_home" from={0} rate={1.0} />
            </Browser>
          </div>
        </AbsoluteFill>
        <Caption text="卡關了？還有官方 Wiki" dur={S3.wiki[1]} delay={4} />
      </At>
      <At s={S3.wall} name="25 Wiki 瀑布牆">
        <WikiWall dur={S3.wall[1]} lockAt={110} />
        <UrlBar url="yanlin-gta.com/wiki" at={10} />
        <Sequence from={S3.wall[1] - 10}>
          <Fade dur={10} inOut="out" />
        </Sequence>
      </At>

      {/* ⑦ sign-off */}
      <At s={S3.platforms} name="26 平台">
        <Platforms dur={S3.platforms[1]} />
      </At>
      <At s={S3.outro} name="27 收場">
        <Clip name="d14_outro" from={56} rate={0.92} />
        <Sequence from={8}>
          <EndCard3 />
        </Sequence>
      </At>
      <Sequence from={TOTAL3 - 10} durationInFrames={10}>
        <Fade dur={10} inOut="out" />
      </Sequence>

      {/* ---------------- sound ---------------- */}
      {bgm ? (
        <>
          <Bed file="scene-day.m4a" from={0} dur={S3.ride[0] + 12} offset={60} />
          <Bed file="scene-market.m4a" from={S3.ride[0] - 12} dur={S3.phone[0] - S3.ride[0] + 24} />
          <Bed file="scene-timed.m4a" from={S3.phone[0] - 12} dur={S3.lab[0] - S3.phone[0] + 24} />
          <Bed
            file="scene-night.m4a"
            from={S3.lab[0] - 12}
            dur={S3.wiki[0] - S3.lab[0] + 24}
            offset={120}
            vol={0.6}
          />
          <Bed
            file="scene-ending.m4a"
            from={S3.wiki[0] - 12}
            dur={TOTAL3 - S3.wiki[0] + 12}
            vol={0.5}
          />
        </>
      ) : null}
      <Sfx file="amb_day.m4a" at={0} vol={0.28} dur={S3.tour[0]} loop={450} />
      {Array.from({ length: 12 }, (_, k) => (
        <Sfx key={k} file="step_grass.m4a" at={8 + k * 17} vol={0.2} dur={12} />
      ))}
      <Sfx file="clock_chime.m4a" at={S3.tower[0] + 30} vol={0.42} dur={120} />
      <Sfx file="thud.m4a" at={S3.title[0] + 9} vol={0.8} dur={24} />
      <Sfx file="engine_scooter.m4a" at={S3.ride[0]} vol={0.5} dur={S3.ride[1] + 4} loop={64} />
      <Sfx file="crossing_bell.m4a" at={S3.area[0] + 26 + 5 * 33} vol={0.3} dur={33} />
      <Sfx file="amb_night.m4a" at={S3.street[0]} vol={0.3} dur={S3.street[1]} loop={450} />
      <Sfx file="ding.m4a" at={S3.phone[0] + 12} vol={0.5} dur={60} />
      <Sfx file="ding.m4a" at={S3.hero[0] + 100} vol={0.55} dur={60} />
      <Sfx file="ding.m4a" at={S3.npcs[0] + 40} vol={0.45} dur={40} />
      <Sfx file="paper.m4a" at={S3.quests[0] + 2} vol={0.45} dur={30} />
      <Sfx file="shutter.m4a" at={S3.wall[0] + 110} vol={0.45} dur={20} />
      <Sfx file="cheer.m4a" at={S3.outro[0] + 30} vol={0.35} dur={100} />
      <Sfx file="thud.m4a" at={S3.outro[0] + 44} vol={0.8} dur={24} />
    </AbsoluteFill>
  );
};
