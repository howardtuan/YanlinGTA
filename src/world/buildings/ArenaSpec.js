// 林口體育館（國立體育大學綜合體育館）純資料規格：由 Concert.js 與 Arena.js 共用，確保首屏不靜態匯入 Arena.js（#389）。
export const ARENA = { ox: 3000, oz: -3000, FX: 24, FZ: 34, R: 10, ROOF: 26 };

// ticket zones (src/systems/minigames/Concert.js sells them): floor standing blocks, then the two seat rings
export const ARENA_ZONES = [
  { name: '搖滾站區 A', price: 6880, seats: 1200, kind: 'floor', z0: 8, z1: 19 },
  { name: '搖滾站區 B', price: 5880, seats: 1500, kind: 'floor', z0: -12, z1: 4 },
  { name: '搖滾站區 C', price: 4880, seats: 1800, kind: 'floor', z0: -31, z1: -15 },
  {
    name: '下層看台 黃橙區',
    price: 3880,
    seats: 3000,
    kind: 'ring',
    ring: 'low',
    row: 5,
    side: true,
  },
  {
    name: '下層看台 藍區',
    price: 2880,
    seats: 2500,
    kind: 'ring',
    ring: 'low',
    row: 7,
    side: false,
  },
  { name: '上層看台', price: 1880, seats: 4500, kind: 'ring', ring: 'up', row: 6, side: false },
];

export const PLAZA = {
  cx: 0,
  cz: -8,
  R: 71,
  baseH: 2.4,
  colH: 17.5,
  beamH: 4.2,
  gateZ: -81,
  busZ: -150,
};

export const STALLS = [
  { id: 'stick', name: '應援手燈', color: '#ff4fa3', x: -15, z: -110 },
  { id: 'card', name: '小卡・手幅', color: '#7b5bff', x: -15, z: -122 },
  { id: 'food', name: '雞排・珍奶', color: '#ff9f1a', x: -15, z: -134 },
  { id: 'sausage', name: '烤香腸', color: '#d0352b', x: 15, z: -110 },
  { id: 'towel', name: '應援毛巾', color: '#1aa3c4', x: 15, z: -122 },
  { id: 'free', name: '粉絲應援發放', color: '#3fae49', x: 15, z: -134 },
];
