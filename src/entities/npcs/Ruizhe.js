// 瑞哲：狼尾帥潮。彥霖的同學，喜歡 ACG 動漫，平常在宿舍看 VTuber，也很愛內卷（作業出來當天就寫完、LeetCode 每天刷）。
// 是劍玉（src/entities/npcs/Jianyu.js）跟品漢堡（src/entities/npcs/PinHan.js）的好麻吉，三個人同一間 278。
// 打字常常把別人的名字打錯：劍玉 → 監獄、品漢堡 → 貧漢堡、彥霖 → 燕林（手機訊息裡，src/ui/phone/Chats.js）。
// 外型照使用者給的照片：狼尾（Character.js hairStyle 'wolf'）、大八角細金屬框眼鏡（glassesStyle 'octa'）、
//   水洗黑 oversize T（紅色金屬風字樣＋白髮動漫少女抱黑熊的印花，圖是自己畫的）、銀項鍊掛一個圓環、
//   黑色牛仔短褲接灰色寬褲（膝下可拆的兩截褲，膝蓋有黑色綁帶和金屬扣）、黑色厚底球鞋、粉紅色手機殼。
// 住力行宿舍 278 寢 5 號床（進門左手邊的上舖），座位是左手邊中間那張書桌（品漢堡 4 號床那張的隔壁）。
//   書桌上方掛著湊あくわ的掛布、層板上有公仔、桌上有みけにゃこ。的壓克力立牌。
// 他看的兩位 VTuber（名字跟外型都是致敬、自己畫的，不是官方圖）：
//   湊あくわ（阿誇）：粉紅雙馬尾、瀏海淺藍挑染、深藍大緞帶、白色女僕頭飾、粉紅眼睛，常打 APEX；
//   みけにゃこ。（咪萪喵）：粉紅短髮加側邊編髮、紅眼睛、白色貓耳帽、女僕頭飾配黑緞帶、黑色蕾絲頸圈、抱著大白貓玩偶，常開歌回。
// 一天（遊戲時鐘）：
//   03:00–09:00 睡 5 號床；09:00–13:00 在書桌寫作業（資結作業出來當天寫完）；13:00–17:00 在圖書館讀書（看得到他在門口休息滑手機）；
//   17:00–22:00 書桌刷 LeetCode（角落小視窗開著 VTuber）；22:00–23:30 劍玉在打特戰英豪的話跟他雙排，不然繼續刷題；
//   23:30–03:00 看 VTuber 直播（單數天湊あくわ打 APEX、雙數天みけにゃこ。歌回）。
// 真實世界的週六、週日（跟品漢堡的約會一樣照真實日期），大約一半的日子 10:00–20:00 去台北逛同人場（學校裡看不到他）。
import * as THREE from 'three';
import { createCharacter } from '../Character.js';
import { torsoProfile } from '../BodyMesh.js';
import { surfaceAt } from '../../world/Terrain.js';
import { canvasTexture, releaseCanvas, uploadAndRelease } from '../../graphics/GpuMemLifecycle.js';
import { DevNPC, M, angDiff } from './DevNPC.js';

const H32 = (n) => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
};
const ell = (g, x, y, rx, ry, rot = 0) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};

export const RUIZHE_LOOK = {
  skin: '#e9c4a2',
  hair: '#17110e',
  hairStyle: 'wolf',
  glasses: true,
  glassesStyle: 'octa',
  glassesColor: '#8d9096',
  shirt: '#2f2f31',
  wash: true,
  longTee: true,
  shorts: '#1b1b1e', // black denim jorts
  pants: true,
  pantsLow: '#6a6c70', // the grey wide jeans below the knee
  wide: true,
  shoes: '#1d1d1f',
  sole: '#2b2b2d',
  build: 1,
  jaw: 1.04,
  face: true,
};

// ---------------------------------------------------------------- the VTubers he watches (drawn here, homages)
// 湊あくわ: a chibi bust, head radius s px, centred on (cx, cy); talk: mouth open
export function drawAkuwa(g, cx, cy, s, talk = false) {
  const P = '#eba7d3',
    PD = '#c77fb4',
    CY = '#8fe6f4',
    NV = '#3c3f8c';
  g.save();
  g.translate(cx, cy);
  g.lineJoin = 'round';
  // twin tails behind the shoulders, light-blue tips
  for (const d of [-1, 1]) {
    g.fillStyle = P;
    g.beginPath();
    g.moveTo(d * s * 0.8, -s * 0.2);
    g.bezierCurveTo(d * s * 1.9, s * 0.3, d * s * 1.3, s * 1.4, d * s * 1.7, s * 2.1);
    g.lineTo(d * s * 1.2, s * 2.0);
    g.bezierCurveTo(d * s * 0.9, s * 1.2, d * s * 1.2, s * 0.5, d * s * 0.55, s * 0.1);
    g.fill();
    g.strokeStyle = CY;
    g.lineWidth = s * 0.07;
    g.beginPath();
    g.moveTo(d * s * 1.25, s * 0.5);
    g.quadraticCurveTo(d * s * 1.45, s * 1.3, d * s * 1.5, s * 1.9);
    g.stroke();
    // the big navy ribbon at the base of the tail
    g.fillStyle = NV;
    g.beginPath();
    g.moveTo(d * s * 0.85, -s * 0.25);
    g.lineTo(d * s * 1.45, -s * 0.85);
    g.lineTo(d * s * 1.55, -s * 0.05);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(d * s * 0.85, -s * 0.2);
    g.lineTo(d * s * 1.35, s * 0.45);
    g.lineTo(d * s * 1.05, s * 0.55);
    g.closePath();
    g.fill();
  }
  // shoulders: navy maid dress, white collar, a gold anchor
  g.fillStyle = NV;
  g.beginPath();
  g.moveTo(-s * 1.2, s * 2.2);
  g.quadraticCurveTo(-s * 1.1, s * 1.05, 0, s * 0.95);
  g.quadraticCurveTo(s * 1.1, s * 1.05, s * 1.2, s * 2.2);
  g.fill();
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(-s * 0.55, s * 1.0);
  g.lineTo(0, s * 1.45);
  g.lineTo(s * 0.55, s * 1.0);
  g.lineTo(0, s * 1.08);
  g.fill();
  g.strokeStyle = '#e8c35a';
  g.lineWidth = s * 0.06;
  g.beginPath();
  g.moveTo(0, s * 1.5);
  g.lineTo(0, s * 1.9);
  g.moveTo(-s * 0.15, s * 1.6);
  g.lineTo(s * 0.15, s * 1.6);
  g.moveTo(-s * 0.18, s * 1.78);
  g.quadraticCurveTo(0, s * 2.0, s * 0.18, s * 1.78);
  g.stroke();
  // hair behind the face
  g.fillStyle = P;
  ell(g, 0, -s * 0.05, s * 1.05, s * 1.0);
  g.fill();
  // face
  g.fillStyle = '#fde8de';
  ell(g, 0, s * 0.15, s * 0.78, s * 0.74);
  g.fill();
  g.fillStyle = 'rgba(247,150,175,.55)';
  ell(g, -s * 0.45, s * 0.42, s * 0.16, s * 0.08);
  g.fill();
  ell(g, s * 0.45, s * 0.42, s * 0.16, s * 0.08);
  g.fill();
  // eyes: pink with a light-blue glint
  for (const d of [-1, 1]) {
    g.fillStyle = '#5b2a52';
    ell(g, d * s * 0.3, s * 0.18, s * 0.17, s * 0.22);
    g.fill();
    g.fillStyle = '#ef8cc8';
    ell(g, d * s * 0.3, s * 0.22, s * 0.13, s * 0.16);
    g.fill();
    g.fillStyle = CY;
    ell(g, d * s * 0.3, s * 0.3, s * 0.07, s * 0.05);
    g.fill();
    g.fillStyle = '#fff';
    ell(g, d * s * 0.26 - s * 0.04, s * 0.1, s * 0.05, s * 0.05);
    g.fill();
  }
  g.strokeStyle = '#7a3f63';
  g.lineWidth = s * 0.05;
  g.beginPath();
  if (talk) {
    g.fillStyle = '#b94d6a';
    ell(g, 0, s * 0.56, s * 0.1, s * 0.08);
    g.fill();
  } else {
    g.arc(0, s * 0.48, s * 0.1, 0.3, Math.PI - 0.3);
    g.stroke();
  }
  // bangs with light-blue streaks
  g.fillStyle = P;
  g.beginPath();
  g.moveTo(-s * 0.95, s * 0.2);
  for (let i = 0; i <= 8; i++) {
    const x = -s * 0.85 + (i * s * 1.7) / 8;
    g.lineTo(x - s * 0.1, -s * 0.05 + (i % 2) * s * 0.12);
    g.lineTo(x, (i % 2 ? -s * 0.1 : s * 0.02) + s * 0.04);
  }
  g.lineTo(s * 0.95, s * 0.2);
  g.lineTo(s * 0.9, -s * 0.7);
  g.lineTo(-s * 0.9, -s * 0.7);
  g.fill();
  g.strokeStyle = CY;
  g.lineWidth = s * 0.08;
  for (const x of [-0.25, -0.1]) {
    g.beginPath();
    g.moveTo(x * s, -s * 0.75);
    g.quadraticCurveTo(x * s + s * 0.05, -s * 0.3, x * s - s * 0.05, s * 0.02);
    g.stroke();
  }
  g.strokeStyle = PD;
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(s * 0.55, -s * 0.6);
  g.quadraticCurveTo(s * 0.75, -s * 0.1, s * 0.7, s * 0.25);
  g.stroke();
  // white maid headdress with a navy ribbon
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(-s * 0.75, -s * 0.72);
  for (let i = 0; i <= 6; i++) g.arc(-s * 0.6 + i * s * 0.2, -s * 0.8, s * 0.12, Math.PI, 0);
  g.lineTo(s * 0.75, -s * 0.72);
  g.fill();
  g.fillStyle = NV;
  g.fillRect(-s * 0.7, -s * 0.74, s * 1.4, s * 0.06);
  g.restore();
}
// みけにゃこ。: white cat-ear hood, short pink hair with a braid, red eyes, black ribbons and choker, a big white cat plush
export function drawMike(g, cx, cy, s, talk = false, plush = true) {
  const P = '#f5a9c9',
    PD = '#d77aa3';
  g.save();
  g.translate(cx, cy);
  // shoulders: black dress, white bow on a black lace choker
  g.fillStyle = '#1c1a1f';
  g.beginPath();
  g.moveTo(-s * 1.2, s * 2.2);
  g.quadraticCurveTo(-s * 1.1, s * 1.05, 0, s * 0.95);
  g.quadraticCurveTo(s * 1.1, s * 1.05, s * 1.2, s * 2.2);
  g.fill();
  g.fillStyle = '#2a262c';
  g.fillRect(-s * 0.3, s * 0.88, s * 0.6, s * 0.14);
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(0, s * 1.05);
  g.lineTo(-s * 0.28, s * 0.92);
  g.lineTo(-s * 0.28, s * 1.2);
  g.closePath();
  g.moveTo(0, s * 1.05);
  g.lineTo(s * 0.28, s * 0.92);
  g.lineTo(s * 0.28, s * 1.2);
  g.closePath();
  g.fill();
  // the white cat-ear hood round the head (pink inside the ears)
  g.fillStyle = '#f7f5f6';
  ell(g, 0, -s * 0.05, s * 1.12, s * 1.08);
  g.fill();
  for (const d of [-1, 1]) {
    g.fillStyle = '#f7f5f6';
    g.beginPath();
    g.moveTo(d * s * 0.35, -s * 0.9);
    g.lineTo(d * s * 0.95, -s * 1.45);
    g.lineTo(d * s * 1.05, -s * 0.5);
    g.fill();
    g.fillStyle = '#f7b9cf';
    g.beginPath();
    g.moveTo(d * s * 0.5, -s * 0.88);
    g.lineTo(d * s * 0.9, -s * 1.25);
    g.lineTo(d * s * 0.95, -s * 0.62);
    g.fill();
  }
  // the hood's little cat face on top
  g.fillStyle = '#2a262c';
  ell(g, -s * 0.22, -s * 0.78, s * 0.05, s * 0.05);
  g.fill();
  ell(g, s * 0.22, -s * 0.78, s * 0.05, s * 0.05);
  g.fill();
  g.strokeStyle = '#2a262c';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.arc(-s * 0.06, -s * 0.7, s * 0.06, 0.2, Math.PI - 0.2);
  g.arc(s * 0.06, -s * 0.7, s * 0.06, 0.2, Math.PI - 0.2);
  g.stroke();
  // hair, face
  g.fillStyle = P;
  ell(g, 0, s * 0.08, s * 0.95, s * 0.88);
  g.fill();
  g.fillStyle = '#fde8de';
  ell(g, 0, s * 0.2, s * 0.74, s * 0.7);
  g.fill();
  g.fillStyle = 'rgba(247,140,165,.5)';
  ell(g, -s * 0.42, s * 0.46, s * 0.15, s * 0.07);
  g.fill();
  ell(g, s * 0.42, s * 0.46, s * 0.15, s * 0.07);
  g.fill();
  for (const d of [-1, 1]) {
    g.fillStyle = '#5a1420';
    ell(g, d * s * 0.29, s * 0.24, s * 0.16, s * 0.2);
    g.fill();
    g.fillStyle = '#e0354a';
    ell(g, d * s * 0.29, s * 0.28, s * 0.12, s * 0.14);
    g.fill();
    g.fillStyle = '#fff';
    ell(g, d * s * 0.29 - s * 0.05, s * 0.17, s * 0.05, s * 0.05);
    g.fill();
  }
  g.strokeStyle = '#7a3a48';
  g.lineWidth = s * 0.045;
  g.beginPath();
  if (talk) {
    g.fillStyle = '#c24f62';
    ell(g, 0, s * 0.58, s * 0.09, s * 0.08);
    g.fill();
  } else {
    // ω
    g.arc(-s * 0.06, s * 0.5, s * 0.06, 0.1, Math.PI - 0.1);
    g.arc(s * 0.06, s * 0.5, s * 0.06, 0.1, Math.PI - 0.1);
    g.stroke();
  }
  // bangs
  g.fillStyle = P;
  g.beginPath();
  g.moveTo(-s * 0.92, s * 0.3);
  for (let i = 0; i <= 7; i++) {
    const x = -s * 0.8 + (i * s * 1.6) / 7;
    g.lineTo(x - s * 0.1, s * 0.0 + (i % 2) * s * 0.1);
    g.lineTo(x, s * 0.08 - (i % 2) * s * 0.05);
  }
  g.lineTo(s * 0.92, s * 0.3);
  g.lineTo(s * 0.85, -s * 0.6);
  g.lineTo(-s * 0.85, -s * 0.6);
  g.fill();
  // side braid
  g.fillStyle = PD;
  for (let i = 0; i < 5; i++) {
    ell(g, s * 0.8, -s * 0.15 + i * s * 0.18, s * 0.1, s * 0.08);
    g.fill();
  }
  // maid headdress with black ribbons, a black heart-and-arrow hair clip
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(-s * 0.7, -s * 0.62);
  for (let i = 0; i <= 5; i++) g.arc(-s * 0.55 + i * s * 0.22, -s * 0.66, s * 0.12, Math.PI, 0);
  g.lineTo(s * 0.7, -s * 0.62);
  g.fill();
  g.fillStyle = '#18161a';
  for (const d of [-1, 1]) {
    g.beginPath();
    g.moveTo(d * s * 0.72, -s * 0.55);
    g.lineTo(d * s * 1.0, -s * 0.8);
    g.lineTo(d * s * 1.02, -s * 0.35);
    g.fill();
  }
  g.strokeStyle = '#18161a';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.moveTo(-s * 0.65, -s * 0.25);
  g.lineTo(-s * 0.35, -s * 0.45);
  g.stroke();
  g.beginPath();
  g.arc(-s * 0.5, -s * 0.36, s * 0.07, 0, Math.PI * 2);
  g.stroke();
  // the big white cat plush in her arms
  if (plush) {
    g.fillStyle = '#fbfbfb';
    ell(g, 0, s * 1.75, s * 0.95, s * 0.65);
    g.fill();
    for (const d of [-1, 1]) {
      g.beginPath();
      g.moveTo(d * s * 0.35, s * 1.2);
      g.lineTo(d * s * 0.8, s * 0.95);
      g.lineTo(d * s * 0.85, s * 1.45);
      g.fill();
    }
    g.fillStyle = '#f6a3bf';
    ell(g, -s * 0.45, s * 1.8, s * 0.17, s * 0.12);
    g.fill();
    ell(g, s * 0.45, s * 1.8, s * 0.17, s * 0.12);
    g.fill();
    g.fillStyle = '#2a262c';
    ell(g, -s * 0.3, s * 1.62, s * 0.06, s * 0.08);
    g.fill();
    ell(g, s * 0.3, s * 1.62, s * 0.06, s * 0.08);
    g.fill();
    g.fillStyle = '#6a3d8f';
    for (let a = 0; a < 4; a++) {
      ell(g, s * 0.55, s * 1.3, s * 0.13, s * 0.05, (a * Math.PI) / 4);
      g.fill();
    }
  }
  g.restore();
}
export const VTUBERS = {
  akuwa: { name: '湊あくわ', nick: '阿誇', draw: drawAkuwa, color: '#eba7d3' },
  mike: { name: 'みけにゃこ。', nick: '咪萪喵', draw: drawMike, color: '#f5a9c9' },
};

// ---------------------------------------------------------------- the laptop screens (512 × 320)
const FONT = '"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif';
const CHAT = {
  akuwa: [
    ['あくわ民', 'あくわ～～'],
    ['kanata_fan', 'ナイス！'],
    ['台灣人', '台灣人報到 🇹🇼'],
    ['瑞哲_wolf', '內卷完來看台了'],
    ['cat_ears', '草'],
    ['ふにゃ', 'えぐい'],
    ['ApexBot', '今日も最強'],
    ['ねむい', '8888888'],
    ['基隆航海王', '瑞哲去睡覺'],
    ['あくわ民', 'かわいい'],
    ['Lumi', 'nice shot!!'],
    ['ゲーマー', 'つよい'],
  ],
  mike: [
    ['にゃ民', 'にゃ～ん'],
    ['瑞哲_wolf', '歌うますぎる😭'],
    ['夜貓子', '明天早八還在聽的舉手'],
    ['mikeFan', '🐾🐾🐾'],
    ['猫好き', 'かわいい！'],
    ['台灣人', '晚安歌回 🌙'],
    ['にゃ民', 'てぇてぇ'],
    ['ねむい', '8888888'],
    ['貧漢堡', '……（已讀）'],
    ['Lumi', 'beautiful voice'],
    ['にゃ民', 'もう一曲！'],
    ['猫好き', '大好き'],
  ],
};
// a live stream: the stage, the chat on the right, the title bar; f: the frame (chat scrolls, mouth moves)
function streamScreen(who, f) {
  return (x, W, H) => {
    const V = VTUBERS[who],
      SW = 352;
    x.fillStyle = '#0f0f12';
    x.fillRect(0, 0, W, H);
    // stage
    x.save();
    x.beginPath();
    x.rect(0, 22, SW, 258);
    x.clip();
    if (who === 'akuwa') {
      // a battle-royale match: sky, ridges, the ground, crosshair and HUD; her on the bottom right
      const gr = x.createLinearGradient(0, 22, 0, 280);
      gr.addColorStop(0, '#8fc3e6');
      gr.addColorStop(0.55, '#e7d8b6');
      gr.addColorStop(1, '#8b7656');
      x.fillStyle = gr;
      x.fillRect(0, 22, SW, 258);
      x.fillStyle = '#7d8aa0';
      x.beginPath();
      x.moveTo(0, 170);
      for (let i = 0; i <= 8; i++) x.lineTo(i * 44, 140 + ((i * 37) % 30));
      x.lineTo(SW, 200);
      x.lineTo(0, 200);
      x.fill();
      x.fillStyle = '#9a8460';
      x.fillRect(0, 196, SW, 84);
      x.fillStyle = '#5c4a35';
      x.fillRect(40 + (f % 3) * 6, 160, 26, 40);
      x.strokeStyle = '#ffffff';
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(166, 150);
      x.lineTo(186, 150);
      x.moveTo(176, 140);
      x.lineTo(176, 160);
      x.stroke();
      x.fillStyle = 'rgba(0,0,0,.45)';
      x.fillRect(8, 250, 120, 24);
      x.fillStyle = '#fff';
      x.font = `700 13px ${FONT}`;
      x.fillText(`🛡 100  ❤ ${100 - (f % 4) * 15}   ${24 - f}/60`, 14, 267);
      x.fillStyle = 'rgba(0,0,0,.35)';
      x.fillRect(8, 30, 70, 70);
      x.strokeStyle = '#fff';
      x.strokeRect(8, 30, 70, 70);
      x.fillStyle = '#ffd23f';
      x.fillRect(40, 62, 6, 6);
      V.draw(x, 292, 210, 40, f % 2 === 1);
    } else {
      // a singing stream: a purple-pink room, a spotlight, notes drifting; her in the middle
      const gr = x.createLinearGradient(0, 22, SW, 280);
      gr.addColorStop(0, '#2a1238');
      gr.addColorStop(1, '#ff8fb6');
      x.fillStyle = gr;
      x.fillRect(0, 22, SW, 258);
      const sp = x.createRadialGradient(176, 40, 10, 176, 120, 190);
      sp.addColorStop(0, 'rgba(255,255,255,.35)');
      sp.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sp;
      x.fillRect(0, 22, SW, 258);
      x.fillStyle = 'rgba(255,255,255,.8)';
      x.font = `700 20px ${FONT}`;
      for (let i = 0; i < 6; i++)
        x.fillText(i % 2 ? '♪' : '♫', 20 + i * 58, 70 + ((i * 41 + f * 17) % 150));
      V.draw(x, 176, 140, 50, f % 2 === 1);
      x.fillStyle = 'rgba(0,0,0,.45)';
      x.fillRect(40, 252, 272, 24);
      x.fillStyle = '#fff';
      x.font = `700 14px ${FONT}`;
      x.textAlign = 'center';
      x.fillText(
        ['♪ にゃ～ん 今夜も大好き ♪', '♪ 夢の中で 会いにいくね ♪', '♪ ねこになって そばにいたい ♪'][
          f % 3
        ],
        176,
        269
      );
      x.textAlign = 'left';
    }
    x.restore();
    // top bar: LIVE, viewers
    x.fillStyle = '#1b1b1f';
    x.fillRect(0, 0, W, 22);
    x.fillStyle = '#e62117';
    x.fillRect(6, 4, 40, 14);
    x.fillStyle = '#fff';
    x.font = `700 11px ${FONT}`;
    x.fillText('● LIVE', 9, 15);
    x.fillStyle = '#cfcfd4';
    x.fillText(`👀 ${(2.1 + (f % 5) * 0.1).toFixed(1)} 萬人正在觀看`, 54, 15);
    // chat
    x.fillStyle = '#18181c';
    x.fillRect(SW, 22, W - SW, H - 22);
    x.fillStyle = '#fff';
    x.font = `700 11px ${FONT}`;
    x.fillText('聊天室', SW + 8, 38);
    const L = CHAT[who];
    x.font = `11px ${FONT}`;
    let y = 58;
    for (let i = 0; i < 11; i++) {
      const [n, t] = L[(i + f * 2) % L.length];
      if (i === 6 && f % 3 === 0) {
        // a Super Chat from him
        x.fillStyle = '#ffca28';
        x.fillRect(SW + 4, y - 11, W - SW - 8, 30);
        x.fillStyle = '#3a2b00';
        x.font = `700 10px ${FONT}`;
        x.fillText('瑞哲_wolf  NT$300', SW + 8, y);
        x.font = `10px ${FONT}`;
        x.fillText('今天也辛苦了！明天早八 💀', SW + 8, y + 13);
        x.font = `11px ${FONT}`;
        y += 34;
        continue;
      }
      x.fillStyle = n === '瑞哲_wolf' ? '#ffd23f' : '#8fb8ff';
      x.fillText(n, SW + 8, y);
      x.fillStyle = '#e8e8ee';
      x.fillText(t, SW + 12 + x.measureText(n).width, y);
      y += 20;
    }
    // title bar
    x.fillStyle = '#121215';
    x.fillRect(0, 280, SW, 40);
    x.save();
    x.beginPath();
    x.arc(20, 300, 13, 0, Math.PI * 2);
    x.clip();
    x.fillStyle = V.color;
    x.fillRect(7, 287, 26, 26);
    V.draw(x, 20, 300, 7, false, false);
    x.restore();
    x.fillStyle = '#fff';
    x.font = `700 12px ${FONT}`;
    x.fillText(
      who === 'akuwa'
        ? '【APEX】ランクいくぞ～！あくわ、今日もがんばる⚓'
        : '【歌枠】みけにゃこ。の深夜うたわく🐾',
      40,
      297
    );
    x.fillStyle = '#9a9aa2';
    x.font = `11px ${FONT}`;
    x.fillText(`${V.name} Ch.`, 40, 313);
  };
}
// LeetCode at night (內卷), the stream small in the corner; f: how far he has typed
function grindScreen(who, f) {
  return (x, W, H) => {
    x.fillStyle = '#1a1a1a';
    x.fillRect(0, 0, W, H);
    x.fillStyle = '#282828';
    x.fillRect(0, 0, W, 24);
    x.fillStyle = '#ffa116';
    x.font = `800 13px ${FONT}`;
    x.fillText('LeetCode', 8, 17);
    x.fillStyle = '#eaeaea';
    x.font = `700 12px ${FONT}`;
    x.fillText('每日一題 🔥 連續 386 天', 86, 17);
    x.fillStyle = '#2cbb5d';
    x.fillText('Solved 1024', 420, 17);
    // problem
    x.fillStyle = '#262626';
    x.fillRect(6, 30, 190, 284);
    x.fillStyle = '#fff';
    x.font = `700 13px ${FONT}`;
    x.fillText('207. Course Schedule', 14, 50);
    x.fillStyle = '#ffb800';
    x.font = `11px ${FONT}`;
    x.fillText('Medium', 14, 68);
    x.fillStyle = '#bdbdbd';
    [
      '選課有先修條件，',
      '判斷能不能修完',
      '全部 numCourses 門課。',
      '',
      '提示：有向圖找環',
      '→ 拓撲排序 / BFS',
      '',
      '（瑞哲：期中考前',
      '  先把 Graph 刷完）',
    ].forEach((t, i) => x.fillText(t, 14, 92 + i * 18));
    // editor
    x.fillStyle = '#1e1e1e';
    x.fillRect(202, 30, 304, 284);
    const code = [
      ['def canFinish(n, pre):', '#dcdcaa'],
      ['    g = [[] for _ in range(n)]', '#d4d4d4'],
      ['    deg = [0] * n', '#d4d4d4'],
      ['    for a, b in pre:', '#c586c0'],
      ['        g[b].append(a); deg[a] += 1', '#d4d4d4'],
      ['    q = [i for i in range(n) if not deg[i]]', '#d4d4d4'],
      ['    seen = 0', '#d4d4d4'],
      ['    while q:', '#c586c0'],
      ['        u = q.pop(); seen += 1', '#d4d4d4'],
      ['        for v in g[u]:', '#c586c0'],
      ['            deg[v] -= 1', '#d4d4d4'],
      ['            if not deg[v]: q.append(v)', '#d4d4d4'],
      ['    return seen == n', '#c586c0'],
    ];
    x.font = '11px Consolas,Menlo,monospace';
    const n = 6 + (f % 8);
    code.slice(0, n).forEach(([t, c], i) => {
      x.fillStyle = '#858585';
      x.fillText(String(i + 1), 208, 50 + i * 16);
      x.fillStyle = c;
      x.fillText(t, 226, 50 + i * 16);
    });
    // the stream in the corner (picture in picture)
    x.save();
    x.translate(380, 226);
    x.scale(0.34, 0.27);
    streamScreen(who, f)(x, 512, 320);
    x.restore();
    x.strokeStyle = '#ffa116';
    x.lineWidth = 1.5;
    x.strokeRect(380, 226, 174, 86);
  };
}
// ranked duo with 劍玉 (his in-game name 基隆航海王)
function duoScreen(f) {
  return (x, W, H) => {
    const gr = x.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, '#0f1923');
    gr.addColorStop(1, '#3b0d14');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.fillStyle = '#ff4655';
    x.font = `900 46px ${FONT}`;
    x.fillText(['RANKED', 'ROUND 14', 'CLUTCH!'][f % 3], W / 2, 120);
    x.fillStyle = '#e8f1ff';
    x.font = `700 22px ${FONT}`;
    x.fillText(`特戰英豪 ・ 雙排 ・ ${9 + (f % 3)} : 8`, W / 2, 160);
    x.font = `700 16px ${FONT}`;
    x.fillStyle = '#ffd23f';
    x.fillText('瑞哲_wolf  白金 III', W / 2, 214);
    x.fillStyle = '#b8e0ff';
    x.fillText('基隆航海王  鑽石 II ◆', W / 2, 240);
    x.textAlign = 'left';
  };
}
const FRAMES = 6;
const GAMES = {};
for (const who of ['akuwa', 'mike'])
  for (let f = 0; f < FRAMES; f++) {
    GAMES[`${who}${f}`] = streamScreen(who, f);
    GAMES[`grind_${who}${f}`] = grindScreen(who, f);
  }
for (let f = 0; f < 3; f++) GAMES[`duo${f}`] = duoScreen(f);
GAMES.default = GAMES.akuwa0;

// his homework (morning): 資料結構 HW08, typed out in the editor
const CODE = [
  '// 資料結構 HW08：AVL Tree（作業今天出、今天寫完）',
  'class Node {',
  '  constructor(key) {',
  '    this.key = key;',
  '    this.left = null;',
  '    this.right = null;',
  '    this.h = 1;',
  '  }',
  '}',
  'const h = (n) => (n ? n.h : 0);',
  'function rotateRight(y) {',
  '  const x = y.left;',
  '  y.left = x.right;',
  '  x.right = y;',
  '  y.h = Math.max(h(y.left), h(y.right)) + 1;',
  '  x.h = Math.max(h(x.left), h(x.right)) + 1;',
  '  return x;',
  '}',
  'function insert(n, key) {',
  '  if (!n) return new Node(key);',
  '  if (key < n.key) n.left = insert(n.left, key);',
  '  else n.right = insert(n.right, key);',
  '  // TODO: 平衡因子 > 1 → 旋轉（順便預習下一章）',
  '  return n;',
  '}',
];

// ---------------------------------------------------------------- his figure
// the front of the tee in the root frame (bind pose, build 1): BodyMesh.js's torso rings (superellipse, e = 2.5),
// plus the oversized tee's drape below the waist
function chestZ(x, y) {
  const P = torsoProfile(0);
  let i = 0;
  while (i + 2 < P.length && P[i + 1][0] < y) i++;
  const [y0, rx0, rz0, c0] = P[i],
    [y1, rx1, rz1, c1] = P[i + 1],
    t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0))),
    k = y >= 0.87 ? Math.min(1, Math.max(0, (1.04 - y) / 0.16)) : 0;
  const rx = rx0 + (rx1 - rx0) * t + 0.04 * k,
    rz = rz0 + (rz1 - rz0) * t + 0.02 * k,
    cz = c0 + (c1 - c0) * t;
  const sa = Math.min(0.995, Math.abs(x) / rx) ** 1.25;
  return cz + rz * Math.sqrt(1 - sa * sa) ** 0.8;
}
// a red metal-band logo: the word, then spikes off its top and bottom edges (mirrored about the middle)
function metalLogo(g, text, cx, cy, w, color) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 200;
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return;
  c.font = '900 80px "Times New Roman",Georgia,serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const k = Math.min(1, w / c.measureText(text).width);
  c.save();
  c.translate(256, 100);
  c.scale(k, 1.3);
  c.fillStyle = color;
  c.fillText(text, 0, 0);
  c.restore();
  const d = c.getImageData(0, 0, 512, 200).data;
  c.fillStyle = color;
  const tri = (px, y, len, dir) => {
    c.beginPath();
    c.moveTo(px - 3, y);
    c.lineTo(px + 3, y);
    c.lineTo(px + (px - 256) * 0.05, y + dir * len);
    c.fill();
  };
  for (let px = 4; px < 508; px += 6) {
    let top = -1,
      bot = -1;
    for (let py = 0; py < 200; py++)
      if (d[(py * 512 + px) * 4 + 3] > 128) {
        if (top < 0) top = py;
        bot = py;
      }
    if (top < 0) continue;
    const m = Math.abs(px - 256) / 256,
      r = H32(Math.abs(px - 256) >> 2);
    tri(px, top + 3, 6 + r * 30 * (1 - m * 0.6), -1);
    tri(px, bot - 3, 4 + ((r * 7) % 1) * 24 * (1 - m * 0.5), 1);
  }
  g.drawImage(cv, cx - 256, cy - 100);
  releaseCanvas(cv);
}
// the print on the front of his tee (like the photo, drawn here): the red logo over a gothic frame with a white-haired
// girl holding a black bear, red script under it; cracked and faded like a washed print
let teeTex = null;
function teePrint() {
  if (teeTex) return teeTex;
  teeTex = canvasTexture(
    512,
    700,
    (g) => {
      const WH = '#ebe8e2',
        LN = '#1b1b1d',
        RD = '#c4262c';
      g.lineCap = g.lineJoin = 'round';
      // frame
      g.strokeStyle = WH;
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(118, 640);
      g.lineTo(118, 300);
      g.quadraticCurveTo(118, 205, 256, 190);
      g.quadraticCurveTo(394, 205, 394, 300);
      g.lineTo(394, 640);
      g.stroke();
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(130, 632);
      g.lineTo(130, 302);
      g.quadraticCurveTo(130, 218, 256, 204);
      g.quadraticCurveTo(382, 218, 382, 302);
      g.lineTo(382, 632);
      g.stroke();
      const curl = (cx, cy, r, dir) => {
        g.beginPath();
        for (let a = 0; a < 9; a += 0.2) {
          const rr = r * (1 - a / 10);
          g.lineTo(cx + Math.cos(a * dir) * rr, cy + Math.sin(a * dir) * rr);
        }
        g.stroke();
      };
      g.lineWidth = 3;
      curl(102, 300, 16, 1);
      curl(410, 300, 16, -1);
      curl(102, 628, 14, -1);
      curl(410, 628, 14, 1);
      g.beginPath();
      g.moveTo(256, 160);
      g.lineTo(256, 190);
      g.moveTo(246, 170);
      g.lineTo(266, 170);
      g.stroke();
      // her long white hair
      g.fillStyle = WH;
      g.beginPath();
      g.moveTo(256, 236);
      g.bezierCurveTo(172, 234, 158, 300, 166, 380);
      g.bezierCurveTo(176, 470, 138, 560, 148, 628);
      g.lineTo(364, 628);
      g.bezierCurveTo(374, 560, 336, 470, 346, 380);
      g.bezierCurveTo(354, 300, 340, 234, 256, 236);
      g.fill();
      g.strokeStyle = '#8f8c86';
      g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const sx = 172 + i * 4,
          ex = 158 + i * 10;
        g.beginPath();
        g.moveTo(sx, 330 + i * 12);
        g.bezierCurveTo(sx + 8, 420, ex - 10, 520, ex, 620);
        g.stroke();
        g.beginPath();
        g.moveTo(512 - sx, 330 + i * 12);
        g.bezierCurveTo(504 - sx, 420, 522 - ex, 520, 512 - ex, 620);
        g.stroke();
      }
      // dress and frilled collar
      g.fillStyle = '#121214';
      g.beginPath();
      g.moveTo(206, 384);
      g.quadraticCurveTo(256, 372, 306, 384);
      g.lineTo(326, 628);
      g.lineTo(186, 628);
      g.fill();
      g.fillStyle = WH;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(216 + i * 16, 388, 9, 0, Math.PI);
        g.fill();
      }
      // face
      g.fillStyle = '#f6f1ea';
      ell(g, 256, 322, 46, 54);
      g.fill();
      g.strokeStyle = LN;
      g.lineWidth = 2.5;
      g.stroke();
      for (const ex of [236, 276]) {
        g.fillStyle = '#1f1d22';
        ell(g, ex, 330, 11, 14);
        g.fill();
        g.fillStyle = RD;
        ell(g, ex, 334, 7, 9);
        g.fill();
        g.fillStyle = '#fff';
        ell(g, ex - 3, 325, 3.5, 3.5);
        g.fill();
        g.strokeStyle = LN;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(ex, 332, 14, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
      }
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(251, 356);
      g.lineTo(261, 356);
      g.stroke();
      // jagged bangs
      g.fillStyle = WH;
      g.beginPath();
      g.moveTo(204, 318);
      const tips = [306, 296, 312, 300, 316, 298, 310, 302, 314];
      tips.forEach((ty, i) => {
        const x0 = 210 + i * 11.5;
        g.lineTo(x0 + 5, 280);
        g.lineTo(x0 + 9, ty);
      });
      g.lineTo(310, 318);
      g.lineTo(312, 268);
      g.quadraticCurveTo(256, 250, 200, 268);
      g.fill();
      // the black bear plush in her arms (one eye sewn on as an X)
      g.fillStyle = '#0e0e10';
      g.strokeStyle = WH;
      g.lineWidth = 2;
      for (const [x0, y0, r] of [
        [214, 424, 20],
        [298, 424, 20],
        [256, 472, 56],
      ]) {
        g.beginPath();
        g.arc(x0, y0, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.fillStyle = '#d9d5ce';
      ell(g, 256, 494, 22, 15);
      g.fill();
      g.fillStyle = LN;
      ell(g, 256, 488, 7, 5);
      g.fill();
      g.fillStyle = '#d9d5ce';
      ell(g, 278, 460, 5, 5);
      g.fill();
      g.strokeStyle = '#d9d5ce';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(228, 454);
      g.lineTo(240, 466);
      g.moveTo(240, 454);
      g.lineTo(228, 466);
      g.stroke();
      g.fillStyle = WH;
      for (const d of [-1, 1]) {
        ell(g, 256 + d * 58, 500, 22, 34, d * 0.5);
        g.fill();
      }
      // red script and the logo
      g.fillStyle = RD;
      g.textAlign = 'center';
      g.font = 'italic 600 23px "Snell Roundhand","Brush Script MT","Segoe Script",cursive';
      g.fillText('Eternally online, forever in your chat', 256, 664);
      g.font = 'italic 600 19px "Snell Roundhand","Brush Script MT","Segoe Script",cursive';
      g.fillText('✝ the stream never ends ✝', 256, 690);
      metalLogo(g, 'INVOLUTION', 256, 92, 470, RD);
      // cracked, faded print
      g.globalCompositeOperation = 'destination-out';
      let sd = 5;
      const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 2600; i++) {
        g.globalAlpha = 0.3 + rnd() * 0.4;
        g.fillRect(rnd() * 512, rnd() * 700, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },
    false
  );
  if (teeTex.isCanvasTexture) uploadAndRelease(teeTex);
  return teeTex;
}
let teeGeo = null;
// the print lies 4 mm off the tee, bent round the chest (torso-pivot frame: root y - 0.93)
function teeGeometry() {
  if (teeGeo) return teeGeo;
  const w = 0.34,
    h = 0.465,
    top = 1.415,
    g = new THREE.PlaneGeometry(w, h, 24, 24),
    P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i),
      y = top - h / 2 + P.getY(i);
    P.setXYZ(i, x, y - 0.93, chestZ(x, y) + 0.004);
  }
  g.computeVertexNormals();
  return (teeGeo = g);
}
// silver chain round the neck with a ring pendant on the chest (the photos)
function necklace(ch) {
  const silver = new THREE.MeshStandardMaterial({
    color: '#d6d8dc',
    metalness: 0.9,
    roughness: 0.25,
  });
  const fr = (x, y) => new THREE.Vector3(x, y - 0.93, chestZ(x, y) + 0.008);
  const pts = [
    new THREE.Vector3(0, 1.556 - 0.93, -0.068),
    new THREE.Vector3(0.05, 1.553 - 0.93, -0.055),
    new THREE.Vector3(0.09, 1.548 - 0.93, -0.008),
    fr(0.085, 1.52),
    fr(0.06, 1.48),
    fr(0.03, 1.445),
    fr(0, 1.434),
    fr(-0.03, 1.445),
    fr(-0.06, 1.48),
    fr(-0.085, 1.52),
    new THREE.Vector3(-0.09, 1.548 - 0.93, -0.008),
    new THREE.Vector3(-0.05, 1.553 - 0.93, -0.055),
  ];
  const chain = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.0013, 4, true),
    silver
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0022, 6, 18), silver);
  ring.position.set(0, 1.42 - 0.93, chestZ(0, 1.42) + 0.009);
  ring.rotation.x = -0.12;
  ch.torso.add(chain, ring);
}
// the straps on the jeans: a black strap with a metal ring down the front of each knee
function straps(ch) {
  const blk = new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.7 }),
    met = new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 0.85, roughness: 0.3 });
  for (const l of ch.legs) {
    const s = l.s,
      a = 0.55 * s;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.004), blk);
    st.position.set(Math.sin(a) * 0.1, -0.1, Math.cos(a) * 0.1);
    st.rotation.set(0, a, 0.12 * s);
    const rg = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0028, 5, 12), met);
    rg.position.set(Math.sin(a) * 0.104, -0.178, Math.cos(a) * 0.104);
    rg.rotation.y = a;
    l.kn.add(st, rg);
  }
}
// a little acrylic charm of みけにゃこ。 hanging off the left front pocket
let charmTex = null;
function charm(ch) {
  const hp = ch.legs.find((l) => l.s > 0)?.hp;
  if (!hp) return;
  if (!charmTex) {
    charmTex = canvasTexture(
      96,
      128,
      (g) => {
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.beginPath();
        g.roundRect(4, 4, 88, 120, 14);
        g.fill();
        drawMike(g, 48, 52, 22, false, false);
      },
      false
    );
    if (charmTex.isCanvasTexture) uploadAndRelease(charmTex);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.036, 0.048),
    new THREE.MeshStandardMaterial({
      map: charmTex,
      transparent: true,
      roughness: 0.3,
      side: THREE.DoubleSide,
    })
  );
  m.position.set(0.075, -0.13, 0.098);
  m.rotation.y = 0.5;
  hp.add(m);
}
// his pink phone, in his right hand when he looks at it outside (pose 'phone')
function phone(ch) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.074, 0.152, 0.011),
    new THREE.MeshStandardMaterial({ color: '#f2c3bf', roughness: 0.5 })
  );
  const scr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.064, 0.138),
    new THREE.MeshBasicMaterial({ color: '#9fd8ff' })
  );
  scr.position.z = 0.006; // the screen towards his face, the pink case outwards
  grp.add(body, scr);
  const el = ch.arms.find((a) => a.s < 0)?.el;
  if (el) {
    grp.position.set(0, -0.27, 0.035);
    grp.rotation.set(-1.2, 0, 0);
    el.add(grp);
  }
  grp.visible = false;
  return grp;
}
// his figure; also used by tools/npc-dashboard
export function createRuizhe() {
  const ch = createCharacter(RUIZHE_LOOK);
  const print = new THREE.Mesh(
    teeGeometry(),
    new THREE.MeshStandardMaterial({
      map: teePrint(),
      transparent: true,
      alphaTest: 0.25,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    })
  );
  ch.torso.add(print);
  necklace(ch);
  straps(ch);
  charm(ch);
  ch.phone = phone(ch);
  return ch;
}

// ---------------------------------------------------------------- the person
// outside the library (張靜愚紀念圖書館, data/npcs.json places): a break from studying, on his phone
const LIB = { x: -148.6, z: -39.4, h: 1.2 };

export class Ruizhe extends DevNPC {
  constructor(game) {
    super(game, {
      id: 'ruizhe',
      name: '瑞哲',
      tag: '🐺 瑞哲',
      tagColor: '#ffb3d1',
      look: RUIZHE_LOOK,
      create: createRuizhe,
      room: 278,
      bed: 5,
      // the middle desk on the left as you come in (next to 品漢堡's, under bed 4)
      desk: (R) => R.desks.find((d) => d.side === 1 && d.u === 1),
      file: 'hw08_avl.js — 資料結構作業',
      repo: 'DS-HW08',
      lines: CODE,
      games: GAMES,
    });
    this.libSpot = { ...LIB, y: surfaceAt(LIB.x, LIB.z) };
    // the laptop in 'dorm' mode shows what he is doing (a stream / LeetCode / the duo), not 'off'
    if (this.lap) {
      const tick = this.lap.tick;
      this.lap.tick = (dt, m, d) => tick(dt, this.mode === 'dorm' ? this.screen() : m, d);
    }
    this._desk();
  }
  // whose stream tonight: 湊あくわ on odd days, みけにゃこ。 on even ones (the late-night stream; the corner window shows the same)
  streamer() {
    return Math.floor(this.g.clock / 1440) % 2 ? 'akuwa' : 'mike';
  }
  // at his desk in 'dorm' mode: 'grind' (LeetCode) | 'duo' (with 劍玉) | 'stream'
  act() {
    const m = this.minute ?? 0;
    if (m >= M(23, 30) || m < M(3)) return 'stream';
    if (m >= M(22) && this.g.jianyu?.mode === 'game' && !this.g.jianyu?.cruising) return 'duo';
    return 'grind';
  }
  screen() {
    const f = Math.floor(performance.now() / 1400),
      a = this.act(),
      w = this.streamer();
    if (a === 'duo') return `duo${f % 3}`;
    if (a === 'stream') return `${w}${f % FRAMES}`;
    return `grind_${w}${f % FRAMES}`;
  }
  // a weekend day in the real world (like 品漢堡's dates): about half of them he is at a 同人場 in 台北
  conDay() {
    const q =
      typeof location !== 'undefined' ? new URLSearchParams(location.search).get('date') : null;
    const mt = q && /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q),
      d = mt ? new Date(+mt[1], +mt[2] - 1, +mt[3]) : new Date();
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) return false;
    return H32(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate() + 77) < 0.5;
  }
  plan(m) {
    this.minute = m;
    if (m >= M(3) && m < M(9)) return 'sleep';
    if (m >= M(10) && m < M(20) && this.conDay()) return 'con';
    if (m < M(13) && m >= M(9)) return 'code';
    if (m >= M(13) && m < M(17)) return 'lib';
    return 'dorm';
  }
  doing() {
    if (this.mode === 'dorm')
      return { grind: '刷題', duo: '跟劍玉雙排', stream: '看 VTuber 直播' }[this.act()];
    return { code: '寫作業', lib: '滑手機' }[this.mode] || '';
  }
  where() {
    const V = VTUBERS[this.streamer()];
    return (
      {
        sleep: '在力行宿舍 278 寢睡覺（5 號床）',
        code: '在力行宿舍 278 寢寫作業（作業出來當天就寫完）📚',
        lib: '在圖書館讀書（出來門口休息滑手機）📱',
        con: '週末去台北逛同人場了 🛍️',
        dorm: {
          grind: '在力行宿舍 278 寢刷 LeetCode 🔥',
          duo: '在力行宿舍 278 寢跟劍玉雙排特戰英豪 🎯',
          stream: `在力行宿舍 278 寢看${V.name}的直播 📺`,
        }[this.act()],
      }[this.mode] || '在力行宿舍 278 寢'
    );
  }
  sleepLines() {
    const V = VTUBERS[this.streamer()];
    return [
      ['瑞哲', '（呼……あくわ……にゃ……）'],
      ['彥霖', `（瑞哲在 5 號床的上舖睡著了，耳機還戴著，手機停在${V.name}的直播存檔……）`],
    ];
  }
  // talking: what he is doing picks the lines (src/ui/phone/Friends.js FRIENDS.ruizhe[grind | duo | stream | code | lib])
  talk() {
    const g = this.g,
      p = g.player.worldPos();
    if (this.mode === 'sleep') {
      g.dialog(this.sleepLines());
      return;
    }
    if (this.mode === 'lib') {
      this.face = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
      this.pause = 4;
    }
    this.state.met = true;
    g.friends?.talk(this.id, this.mode === 'dorm' ? this.act() : this.mode, () => {
      this.pause = 0.6;
    });
  }
  // at the desk: typing (LeetCode, the duo) or sitting back watching the stream, a laugh now and then
  dormSpot() {
    return this.home.seat;
  }
  dormTick(dt, at) {
    const g = this.g,
      p = g.player.pos,
      talking = g.hud.inDialog && Math.hypot(p.x - at.x, p.z - at.z) < 3,
      a = this.act();
    this.ch.root.rotation.y =
      at.h + (talking ? angDiff(Math.atan2(p.x - at.x, p.z - at.z), at.h) * 0.35 : 0);
    this.ch.update(dt, {
      speed: 0,
      mode: 'sit',
      pose: talking ? 'talk' : a === 'stream' ? 'watch' : 'type',
    });
  }
  onMode(mode) {
    if (this.ch.phone) this.ch.phone.visible = mode === 'lib';
  }
  _outdoor(dt, mode) {
    if (mode === 'lib') {
      this.standAt(dt, this.libSpot, 'phone');
      return;
    }
    this.ch.root.visible = false; // at a 同人場 in 台北
  }
  // ---- his desk: a tapestry of 湊あくわ over it, figures on the shelf, an acrylic stand of みけにゃこ。 ----
  _desk() {
    const H = this.home;
    if (!H) return;
    const { L, R } = H,
      desk = this.cfg.desk(R),
      s = Math.sign(-Math.sin(desk.face)) || 1, // from the desk towards the aisle
      wall = desk.x - s * 0.3,
      rotY = L.k.heading(desk.face + Math.PI);
    const grp = (this.props = new THREE.Group());
    const put = (o, lx, lz, y) => {
      const [x, z] = L.W(lx, lz);
      o.position.set(x, L.B + R.y + y, z);
      o.rotation.y = rotY;
      grp.add(o);
      return o;
    };
    // the tapestry above the shelves
    const tapTex = canvasTexture(
      400,
      440,
      (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 440);
        gr.addColorStop(0, '#bfe9f7');
        gr.addColorStop(1, '#f4b6da');
        g.fillStyle = gr;
        g.fillRect(0, 0, 400, 440);
        g.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 14; i++) {
          g.beginPath();
          g.arc((i * 97) % 400, (i * 151) % 440, 4 + (i % 3) * 3, 0, Math.PI * 2);
          g.fill();
        }
        drawAkuwa(g, 200, 190, 82);
        g.fillStyle = '#3c3f8c';
        g.font = `900 42px ${FONT}`;
        g.textAlign = 'center';
        g.fillText('湊あくわ', 200, 400);
        g.font = `700 18px ${FONT}`;
        g.fillText('⚓ AKUWA ⚓', 200, 425);
      },
      false
    );
    if (tapTex.isCanvasTexture) uploadAndRelease(tapTex);
    const tap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.506),
      new THREE.MeshStandardMaterial({ map: tapTex, roughness: 0.9 })
    );
    put(tap, wall + s * 0.03, desk.z, 1.92);
    // figures on the lower shelf (top at 1.12): あくわ, みけにゃこ。 and a white cat plush
    const M3 = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
    const fig = (hair, dress, extra) => {
      const f = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.006, 16),
        M3('#e8f4ff', { transparent: true, opacity: 0.7 })
      );
      base.position.y = 0.003;
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 12), M3(dress));
      body.position.y = 0.04;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), M3('#fde3d6'));
      head.position.y = 0.088;
      const hr = new THREE.Mesh(
        new THREE.SphereGeometry(0.023, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        M3(hair)
      );
      hr.position.set(0, 0.09, -0.003);
      f.add(base, body, head, hr);
      extra(f, M3);
      return f;
    };
    const aq = fig('#eba7d3', '#3c3f8c', (f, m) => {
      for (const d of [-1, 1]) {
        const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.045, 3, 8), m('#eba7d3'));
        tail.position.set(d * 0.026, 0.06, -0.006);
        tail.rotation.z = d * 0.25;
        const rb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.006), m('#3c3f8c'));
        rb.position.set(d * 0.022, 0.095, -0.004);
        f.add(tail, rb);
      }
    });
    const mk = fig('#f5a9c9', '#1c1a1f', (f, m) => {
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
        m('#f7f5f6')
      );
      hood.position.set(0, 0.092, -0.004);
      f.add(hood);
      for (const d of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.016, 4), m('#f7f5f6'));
        ear.position.set(d * 0.014, 0.116, 0);
        f.add(ear);
      }
    });
    const cat = new THREE.Group();
    {
      const w = M3('#fbfbfb');
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), w);
      b.scale.set(1.2, 0.85, 1);
      b.position.y = 0.03;
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), w);
      hd.position.set(0, 0.07, 0.01);
      cat.add(b, hd);
      for (const d of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.02, 4), w);
        ear.position.set(d * 0.016, 0.098, 0.01);
        const ck = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M3('#f6a3bf'));
        ck.position.set(d * 0.016, 0.066, 0.035);
        cat.add(ear, ck);
      }
    }
    const shelfX = wall + s * 0.15;
    for (const f of [aq, mk, cat]) f.scale.setScalar(1.4);
    put(aq, shelfX, desk.z - 0.32, 1.12);
    put(mk, shelfX, desk.z - 0.14, 1.12);
    put(cat, shelfX, desk.z + 0.24, 1.12);
    // the acrylic stand on the desk, by the wall at the other end from the laptop
    const standTex = canvasTexture(
      200,
      300,
      (g2) => {
        drawMike(g2, 100, 110, 52);
        g2.fillStyle = '#18161a';
        g2.font = `900 22px ${FONT}`;
        g2.textAlign = 'center';
        g2.fillText('みけにゃこ。', 100, 285);
      },
      false
    );
    if (standTex.isCanvasTexture) uploadAndRelease(standTex);
    const ac = new THREE.Group();
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, 0.15),
      new THREE.MeshStandardMaterial({
        map: standTex,
        transparent: true,
        alphaTest: 0.1,
        roughness: 0.2,
        side: THREE.DoubleSide,
      })
    );
    pl.position.y = 0.08;
    const ab = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.006, 0.04),
      M3('#e8f4ff', { transparent: true, opacity: 0.6 })
    );
    ab.position.y = 0.003;
    ac.add(pl, ab);
    put(ac, wall + s * 0.12, desk.z - 0.3, 0.76);
    this.g.scene.add(grp);
    this.propsAt = { x: this.home.seat.x, z: this.home.seat.z };
  }
  update(dt) {
    super.update(dt);
    if (this.props) {
      const p = this.g.player.pos;
      this.props.visible = Math.hypot(p.x - this.propsAt.x, p.z - this.propsAt.z) < 25;
    }
  }
}
