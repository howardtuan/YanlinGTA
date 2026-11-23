// 分區註冊表：校內各區與周邊街道自建的部分，一區一列。
// 新增一個區：開一個新檔（例如 src/world/zones/ZoneA.js）寫建模，然後在下面 ZONES 加一列，src/core/Game.js 和 src/world/Interiors.js 都不用改。
//
// 每一列可以有這些欄位（都可以省略）：
//   name                 給人看的名字
//   drop                 要從 OSM／補建街區拿掉的建物 id（自建的房子取代它們）
//   fix(b)               每棟建物先跑一次的資料修正（輪廓、高度、類型）
//   add(buildings)       新增建物到 data.buildings（push 到最後面）
//   look(b)              每棟建物換外觀 look／分段高度（只動自己那幾棟；src/world/MapBuilder.js 照舊從輪廓畫牆和屋頂）
//   footprints(data)     保留範圍：樹、街道家具、出生點不會長進來
//   terrain(data)        執行期地形修改（例如學活的下沉舞台）
//   trees()              額外指定位置的樹
//   vegHide(data)        蓋完植栽後才補的構件範圍，裡面的樹和灌木只隱藏不重抽
//   treeHide(data)       可以走上去的平坦平台範圍，裡面的樹、棕櫚、灌木都隱藏、樹的碰撞拿掉（不重抽，src/world/MapBuilder.js opts.treeHide）
//   ownSign              自己掛店名的 POI 名稱（地圖就不再另外畫招牌）
//   build(I, scene, data, collision)   自建的模型、碰撞、可走的地面、E 鍵動作
//
// 順序很重要：ZONES 的順序就是 build 的順序，跟拆檔前 src/world/Interiors.js 裡的呼叫順序完全一樣；很多地方共用亂數，
// 順序一換，樹、灌木、冷氣的位置就會跟著變。新的區加在最後面。
import * as THREE from 'three';
import { Kit, regMat, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS } from '../Kit.js';
import { CF_DROP, campusFix, campusAdd } from '../CampusFix.js';
import { teaFootprint, teaRowFootprints, buildTeaShop, buildTeaRow } from '../buildings/StreetTea.js';
import { darenFootprints, darenStreetFootprints, darenGdFootprints, DAREN_ST, buildDarenCorner, buildDarenStreet, buildDarenGd } from '../buildings/StreetDaren.js';
import { ZB_ST, zbFootprints, buildZhongbeiStreet } from '../buildings/StreetZhongbei.js';
import { D1_ST, d1Fix, d1Look, d1Footprints, buildDaren1Street } from '../buildings/StreetDaren1.js';
import { D5_ST, d5Footprints, buildDaren5Street } from '../buildings/StreetDaren5.js';
import { SJ_ST, sjFootprints, buildShijianStreet } from '../buildings/StreetShijian.js';
import { D2_ST, d2Footprints, d2Look, buildDaren2Street } from '../buildings/StreetDaren2.js';
import { XZ_ST, xzFootprints, buildXinzhongbeiStreet } from '../buildings/StreetXinzhongbei.js';
import { gordonFootprint, buildGordon } from '../buildings/GordonShop.js';
import { buildArena } from '../buildings/Arena.js';
import { gateExtrasFootprints, gateTrees, buildGateExtras } from '../buildings/GateExtras.js';
import { WEICHE_ID, weicheLook, weicheFootprints, buildWeiche } from '../../systems/minigames/Weiche.js';
import { applyZoneE, zoneEFootprints, zoneETreeHide, buildZoneE } from './ZoneE.js';
import { zoneGLook, zoneGFootprints, zoneGTerrain, buildZoneG } from './ZoneG.js';
import { buildSacB1 } from '../buildings/SacB1.js';
import { zoneHLook, zoneHAdd, buildZoneH } from './ZoneH.js';
import { zoneALook, zoneATerrain, zoneATreeHide, buildZoneA } from './ZoneA.js';
import { zoneDLook, zoneDTreeHide, buildZoneD } from './ZoneD.js';
import { zoneBLook, zoneBTerrain, zoneBTreeHide, buildZoneB } from './ZoneB.js';
import { lixingLook, lixingVegHide, buildLixing } from '../buildings/Lixing.js';
import { sacLook, buildSac } from '../buildings/Sac.js';
import { LIANGSHAN_ID, ENCI_ID, liangshanLook, enciLook, dormsFootprints, buildDorms } from '../buildings/Dorms.js';
import { zoneCLook, zoneCVegHide, buildZoneC } from './ZoneC.js';
import { courtTerrain, courtTreeHide, buildCourts } from '../Court.js';
import { HZ_ST, hzFix, hzLook, hzFootprints, buildHuanzhongStreet } from '../buildings/StreetHuanzhong.js';
import { PZ_ST, pzFootprints, buildPuzhongStreet } from '../buildings/StreetPuzhong.js';
import { RX_ST, rxFootprints, buildRixinStreet } from '../buildings/StreetRixin.js';
import { DF_ST, dfFootprints, buildDarenFill } from '../buildings/StreetDarenFill.js';

export const ZONES = [
  // ---------------- 校內資料修正 ----------------
  { name: '校內第 0 批資料修正', drop: CF_DROP, fix: campusFix, add: campusAdd }, // src/world/CampusFix.js
  // ---------------- 周邊街道 ----------------
  { // 茶學苑（門口點餐，src/systems/minigames/TeaShop.js 放店員）與中北路南側那排店面
    name: '中北路南側：茶學苑那排', footprints: () => [teaFootprint(), ...teaRowFootprints()],
    build: (I, scene) => { I.tea = buildTeaShop(I, scene); buildTeaRow(I, scene); },
  },
  { // 中北路口轉角、大仁街兩側公寓店面、原泰阿杜／餡實餃色；f1558 與大仁街的填充樓讓給自建的店面
    name: '大仁街', drop: ['f1558', ...DAREN_ST.drop], footprints: () => [...darenFootprints(), ...darenStreetFootprints(), ...darenGdFootprints()],
    build: (I, scene) => { buildDarenCorner(I, scene); buildDarenStreet(I, scene); buildDarenGd(I, scene); },
  },
  { // 中北路兩側街屋
    name: '中北路街屋', drop: ZB_ST.drop, ownSign: ZB_ST.ownSign, footprints: zbFootprints,
    build: (I, scene) => buildZhongbeiStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { name: '戈登肉鋪', footprints: () => [gordonFootprint()], build: (I, scene) => { I.gordon = buildGordon(I, scene); } }, // 校史館西南側草坪
  { name: '林口體育館（地圖外，演唱會）', build: (I, scene) => { I.arena = buildArena(I, scene, Kit, regMat); } }, // src/systems/minigames/Concert.js
  // ---------------- 校內各區 ----------------
  { // 正門：混凝土校名牆、校園導覽牌、停車場入口、P 字塔
    name: '正門', footprints: gateExtrasFootprints, trees: gateTrees, build: (I, scene) => buildGateExtras(I, scene),
  },
  { // 維澈樓：木盒、樓梯、柱子
    name: '維澈樓', look: b => { if (b.id === WEICHE_ID) b.look = weicheLook(); }, footprints: weicheFootprints, build: buildWeiche,
  },
  { // 望樓、信樓（景觀系館）、愛樓的平台、步道、榕樹範圍只藏植栽（treeHide），不放進 footprints
    name: 'E 區：建築館、祐生、設計學院、望樓、信樓、愛樓', look: applyZoneE, footprints: zoneEFootprints, treeHide: zoneETreeHide, build: buildZoneE,
  },
  { // 學活南面下沉舞台與 B1 麥當勞（地形坑）、往二樓門廊的大階梯、柱廊、弧形玻璃、斜裙、樓梯塔等
    name: 'G 區', look: zoneGLook, footprints: zoneGFootprints, terrain: zoneGTerrain, build: buildZoneG,
  },
  { // 學活 B1 西半：樓梯廳、用餐區、學餐攤販（坑與入口在 G 區）
    name: 'G 區：學活 B1', build: (I, scene, data, collision) => buildSacB1(I, scene, Kit, regMat, collision),
  },
  { // 信實、熱誠、薄膜中心、實英樓、忍耐樓；新增知行領航館、4館南北兩段、忍耐樓北盒
    name: 'H 區', add: zoneHAdd, look: zoneHLook, build: buildZoneH,
  },
  { // 良善樓、恩慈樓外觀（白色 roof_drum 讓給藍色玻璃圓盤）、大仁街校界牆、A2 門牆、恩慈小門
    name: 'F 區宿舍', vegHide: dormsFootprints, build: (I, scene, data) => buildDorms(I, scene, data),
    look: b => {
      if (b.id === LIANGSHAN_ID) { b.look = liangshanLook(b.look); if (b.feature) b.feature = b.feature.filter(f => f !== 'roof_drum'); }
      if (b.id === ENCI_ID) b.look = enciLook(b.look);
    },
  },
  { // 行政大樓（含校史館）改名、懷恩樓門廊三拱、圖書館南面平台與兩段階梯（data.levels）、雙塔、折板、科學館樓梯塔與天文台、下沉廣場泉源之谷
    name: 'A 區', look: zoneALook, terrain: zoneATerrain, treeHide: zoneATreeHide, build: buildZoneA,
  },
  { // 陸華樓大階梯與東端樓梯間、北側水池、真知屋頂 D 形地標與西南入口、篤信門廊與橘紅欄杆、電學長條 9F＋圓筒、中正樓拱形凹陽台、莊敬分段與舷窗、土木 7F 與南面入口
    name: 'D 區', look: zoneDLook, treeHide: zoneDTreeHide, build: buildZoneD,
  },
  { // 管理大樓穿堂與柱廊、5F 框架層、紅瓦；自強ㄇ字中庭（parts）與東南入口；資管欄板紅邊、礫石庭園；商業設計館（原「商設館」）改輪廓；工學館拆 8F／4F／3F、懸挑樓梯平台、樓梯塔
    name: 'C 區', look: zoneCLook, vegHide: zoneCVegHide, build: buildZoneC,
  },
  { // 理學大樓屋頂設備與南面大階梯入口（data.levels）、化學館白框架＋土黃牆與立管、恩惠堂門廊方塔與尖頂、副堂雙坡、林森館花磚、A6 步道與招牌
    name: 'B 區', look: zoneBLook, terrain: zoneBTerrain, treeHide: zoneBTreeHide, build: buildZoneB,
  },
  { // 力行宿舍室內：四層樓、兩個天井、樓梯、浴廁、276～281 六人房、沿新中北路的門房（外觀在 G 區）
    name: '力行宿舍室內', look: lixingLook, vegHide: lixingVegHide,
    build: (I, scene, data, collision) => buildLixing(I, scene, data, collision, Kit, regMat),
  },
  { // 學生活動中心室內：一～四樓、培英廳、二樓中庭接新中北路天橋、三樓接往生科館的空橋、B1 旋轉梯上一樓（外觀在 G 區，B1 在「G 區：學活 B1」）
    name: '學活室內', look: sacLook,
    build: (I, scene, data, collision) => buildSac(I, scene, data, collision, Kit, regMat),
  },
  { // 東側光電頂棚籃排球場、西側室外球場：籃架、球網、頂棚（鋪面與線在 src/world/MapBuilder.js 的 areas 圖層）
    name: '體育園區籃排球場', terrain: courtTerrain, treeHide: courtTreeHide, build: (I, scene) => buildCourts(I, scene, Kit, regMat),
  },
  { // 環中東路（校園東南側）與環中東路708巷兩側街屋
    name: '環中東路街屋', drop: HZ_ST.drop, fix: hzFix, look: hzLook, ownSign: HZ_ST.ownSign, footprints: hzFootprints,
    build: (I, scene, data, collision) => buildHuanzhongStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }, data, collision),
  },
  { // 大仁一街兩側街屋
    name: '大仁一街街屋', drop: D1_ST.drop, fix: d1Fix, look: d1Look, ownSign: D1_ST.ownSign, footprints: d1Footprints,
    build: (I, scene) => buildDaren1Street(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 普忠路兩側街屋（鐵路地下道口到新中北路口）
    name: '普忠路街屋', drop: PZ_ST.drop, ownSign: PZ_ST.ownSign, footprints: pzFootprints,
    build: (I, scene) => buildPuzhongStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 大仁五街兩側：長條集合住宅大樓的一樓店面與幾棟較矮的房子
    name: '大仁五街街屋', drop: D5_ST.drop, ownSign: D5_ST.ownSign, footprints: d5Footprints,
    build: (I, scene) => buildDaren5Street(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 實踐路兩側街屋（中北路口那幾棟在中北路街屋）
    name: '實踐路街屋', drop: SJ_ST.drop, ownSign: SJ_ST.ownSign, footprints: sjFootprints,
    build: (I, scene) => buildShijianStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 大仁二街兩側街屋（恩慈小門到實踐路口）
    name: '大仁二街街屋', drop: D2_ST.drop, look: d2Look, ownSign: D2_ST.ownSign, footprints: d2Footprints,
    build: (I, scene, data, collision) => buildDaren2Street(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }, data, collision),
  },
  { // 新中北路（校園西南側）與新中北路469巷兩側街屋、圍牆
    name: '新中北路街屋', drop: XZ_ST.drop, ownSign: XZ_ST.ownSign, footprints: xzFootprints,
    build: (I, scene) => buildXinzhongbeiStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 日新路兩側街屋（中原夜市，中山東路口到實踐路口；實踐路口兩個轉角在實踐路街屋）
    name: '日新路街屋', drop: RX_ST.drop, ownSign: RX_ST.ownSign, footprints: rxFootprints,
    build: (I, scene) => buildRixinStreet(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
  { // 大仁街一帶補建：從大仁街看得到的通用填充樓換成實景（目前是大仁四街口那棟五層公寓）
    name: '大仁街補建', drop: DF_ST.drop, ownSign: DF_ST.ownSign, footprints: dfFootprints,
    build: (I, scene) => buildDarenFill(I, scene, { THREE, Kit, finishRow, rowTools, ROWT, YHT, sg, lcg, MATS }),
  },
];

// ---------------- src/core/Game.js / src/world/Interiors.js 用的彙總 ----------------
export const zoneDrops = () => ZONES.flatMap(z => z.drop || []);
export const zoneOwnSigns = () => ZONES.flatMap(z => z.ownSign || []);
export function zonesFix(buildings) { for (const z of ZONES) if (z.fix) for (const b of buildings) z.fix(b); }
export function zonesAdd(buildings) { for (const z of ZONES) z.add?.(buildings); }
export function zonesLook(b) { for (const z of ZONES) z.look?.(b); }
export const zoneFootprints = (data) => ZONES.flatMap(z => z.footprints?.(data) || []);
export function zonesTerrain(data) { for (const z of ZONES) z.terrain?.(data); }
export const zoneTrees = () => ZONES.flatMap(z => z.trees?.() || []);
export const zoneVegHide = (data) => ZONES.flatMap(z => z.vegHide?.(data) || []);
export const zoneTreeHide = (data) => ZONES.flatMap(z => z.treeHide?.(data) || []);
export function buildZones(I, scene, data, collision) { for (const z of ZONES) z.build?.(I, scene, data, collision); }
