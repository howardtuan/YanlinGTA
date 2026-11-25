import * as THREE from 'three';
import { buildWorld, buildSkyline, mulberry32, LABEL_LAYER } from '../world/MapBuilder.js';
import { installShadowDepth } from '../graphics/ShadowFix.js';
import { Vehicle, sameLevel, bodyGap } from '../entities/Vehicles.js';
import { Traffic, Peds } from '../entities/NPC.js';
import { Player, CameraRig } from '../entities/Player.js';
import { Input } from './Input.js';
import { Audio, loadSettings, saveSettings } from '../systems/AudioSystem.js';
import {
  buildInteriors,
  imFootprint,
  sacTrimmedPts,
  MCD_SPEC,
  GUARD_SPECS,
  guardFootprint,
  mainGateLawn,
  mainGateKeep,
  MAIN_GATE,
  IM_SPEC,
  YH_SPEC,
  yhFootprint,
  yhOutline,
} from '../world/Interiors.js';
import {
  zoneDrops,
  zoneOwnSigns,
  zonesFix,
  zonesAdd,
  zonesLook,
  zoneFootprints,
  zonesTerrain,
  zoneTrees,
  zoneVegHide,
  zoneTreeHide,
} from '../world/zones/Zones.js';
import { GD_SPEC, gordonOutline } from '../world/buildings/GordonShop.js';
import { HUD } from '../ui/HUD.js';
import { Missions, SPEECH } from '../systems/MissionSystem.js';
import { createCharacter, randomStudent } from '../entities/Character.js';
import { loadTerrain, surfaceAt } from '../world/Terrain.js';
import { SkySystem } from '../graphics/SkySystem.js';
import { PostFX } from '../graphics/PostFX.js';
import { AimGlow } from '../graphics/AimGlow.js';
import { Phone } from '../ui/phone/Phone.js';
import { GateDuty } from '../systems/minigames/GateDuty.js';
import { McShift } from '../systems/minigames/McShift.js';
import { Prompts, dual } from '../ui/Prompts.js';
import { writeSave } from '../systems/SaveSystem.js';
import { PC } from '../ui/PC.js';
import { Detective } from '../systems/minigames/Detective.js';
import { Sunday } from '../systems/minigames/Sunday.js';
import { CustomNpcs } from '../entities/npcs/CustomNPCs.js';
import { Wardrobe } from '../ui/Wardrobe.js';
import { Nav } from '../systems/Navigation.js';
import { Airdrop } from '../systems/minigames/Airdrop.js';
import { Drone } from '../entities/Drone.js';
import { PhotoMode } from '../ui/PhotoMode.js';
import { Market } from '../systems/StockMarket.js';
import { Race } from '../systems/minigames/Race.js';
import { Friends } from '../ui/phone/Friends.js';
import { TeaShop } from '../systems/minigames/TeaShop.js';
import { garryOutline } from '../world/buildings/GarryHome.js';
import { clubFootprint } from '../world/buildings/ClubRoom.js';
import { ClubMembers } from '../entities/npcs/ClubMembers.js';
import { Concerts } from '../systems/minigames/Concert.js';
import { Garry } from '../entities/npcs/Garry.js';
import { Jianyu } from '../entities/npcs/Jianyu.js';
import { Houshe } from '../entities/npcs/Houshe.js';
import { Zz } from '../entities/npcs/Zz.js';
import { ZzInjury } from '../systems/quests/ZzInjury.js';
import { DormMahjong } from '../systems/mahjong/Mahjong.js';
import { TzuyuWagyu } from '../systems/quests/TzuyuWagyu.js';
import { YuluTea } from '../systems/quests/YuluTea.js';
import { Yulu } from '../entities/npcs/Yulu.js';
import { Richard } from '../entities/npcs/Richard.js';
import { Howard } from '../entities/npcs/Howard.js';
import { PinHan } from '../entities/npcs/PinHan.js';
import { PinHanCar } from '../systems/quests/PinHanCar.js';
import { PinHanRide } from '../systems/minigames/PinHanRide.js';
import { Ruizhe } from '../entities/npcs/Ruizhe.js';
import { serviceTick, serviceName } from '../entities/npcs/Service.js';
import { Mingshan } from '../entities/npcs/Mingshan.js';
import { YeeMing } from '../entities/npcs/Yeeming.js';
import { Gordon } from '../entities/npcs/Gordon.js';
import { LibraryLink } from '../world/buildings/Library.js';
import { Hank } from '../entities/npcs/Hank.js';
import { FirstPerson } from '../entities/FirstPerson.js';
import { NewsDesk } from '../ui/phone/NewsUI.js';
import { initKernels } from '../graphics/wasm/kernels.js';
import { Physics, G } from '../physics/Physics.js';
import { Chassis } from '../physics/VehPhysics.js';
import { Ragdoll } from '../physics/Ragdoll.js';
import { Walker } from '../entities/Walker.js';
import { buildPhysicsWorld } from '../physics/PhysWorld.js';

import { GameLoop, resolveQuality, subQ } from './GameLoop.js';
import { MenuManager, lockPointer } from './MenuManager.js';
import { resolveRuntimeProfile, applySafeMode } from './PerfProfile.js';
import { createBootDiag } from './BootDiag.js';
import { PerfHud } from './PerfHud.js';
import { VehicleSpawner } from './VehicleSpawner.js';

const $ = (id) => document.getElementById(id);
const onClick = (id, fn) => {
  const el = $(id);
  if (el) el.onclick = fn;
  else console.warn(`missing #${id}`);
};
const setLoad = (p, t) => {
  const f = $('loadFill');
  if (f) f.style.width = `${p * 100}%`;
  const tx = $('loadText');
  if (tx) tx.textContent = `${t || '載入中 LOADING'} · ${Math.round(p * 100)}%`;
};
// resolves after the browser has painted: an await on a bare requestAnimationFrame resumes inside that frame's
// callbacks, before the paint, so the long synchronous step stage() starts next (buildWorld, buildInteriors) would
// keep the previous loading text on screen for its whole run
const nextFrame = () =>
  new Promise((r) => {
    requestAnimationFrame(() => setTimeout(r, 0));
  });

class Game {
  async init() {
    this.gameLoop = new GameLoop(this);
    this.menuManager = new MenuManager(this);
    this.vehicleSpawner = new VehicleSpawner(this);
    this.settings = loadSettings();
    this.perfProfile = resolveRuntimeProfile(this.settings);
    this.bootDiag = createBootDiag({
      diagMode: this.perfProfile.diagMode,
      safeModeOverride: this.perfProfile.flags.safeMode,
    });
    await this.bootDiag.begin();
    if (this.bootDiag.isSafeMode()) applySafeMode(this.perfProfile);

    const stage = async (key, p, t) => {
      setLoad(p, t);
      this.bootDiag.checkpoint(key, p, t);
      await nextFrame();
    };

    await stage('fetch-and-wasm', 0.02, '載入地圖資料');
    this.physics = new Physics();
    const [data, terrain] = await Promise.all([
      fetch(`data/cycu.json${window.__q || ''}`).then((r) => r.json()),
      fetch(`data/terrain.json${window.__q || ''}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      initKernels(),
      this.physics.init(),
    ]);
    loadTerrain(terrain);
    this.data = data;
    this.quality = resolveQuality(this.settings.quality, this.settings);
    if (this.bootDiag.isSafeMode() && (this.settings.quality || 'auto') === 'auto') {
      this.quality = 'low';
    }
    this.lowQ = this.quality === 'low' || this.quality === 'xlow';
    this.xlowQ = this.quality === 'xlow';

    const fillOn = this.settings.fill !== 'off';
    const keepSyn = (o) => !o.synthetic || (fillOn && !(this.lowQ && o.lod));
    for (const k of ['buildings', 'areas', 'barriers']) data[k] = data[k].filter(keepSyn);

    const DROP = new Set(zoneDrops());
    data.buildings = data.buildings.filter((b) => !DROP.has(b.id));
    zonesFix(data.buildings);
    zonesAdd(data.buildings);

    for (const b of data.buildings) {
      if (b.name === '資訊管理學系') {
        b.skip = true;
        b.labelH = 13.5;
      }
      if (b.name === '警衛室') b.skip = true;
      if (b.name === '學生活動中心') b.pts = sacTrimmedPts();
      zonesLook(b);
      if (b.id === YH_SPEC.id) {
        b.skip = true;
        b.pts = yhOutline();
      }
      if (b.id === YH_SPEC.next) {
        const c = Math.cos(YH_SPEC.ang),
          s = Math.sin(YH_SPEC.ang),
          ext = YH_SPEC.W * (YH_SPEC.k - 1);
        b.pts = b.pts.map(([x, z]) =>
          (x - YH_SPEC.ox) * c + (z - YH_SPEC.oz) * s < YH_SPEC.W + 0.5
            ? [x + c * ext, z + s * ext]
            : [x, z]
        );
      }
    }

    for (const w of data.barriers) {
      if (
        w.type === 'wall' &&
        w.pts.length < 8 &&
        w.pts.some(([x, z]) => Math.abs(x + 62) < 1.5 && Math.abs(z - 271) < 1.5)
      ) {
        w.skin = 'cycu-brick';
      }
    }
    data.buildings.push({
      id: 'gordon',
      name: '戈登肉鋪',
      kind: 'commercial',
      pts: gordonOutline(),
      h: GD_SPEC.FH + 1.9,
      floors: 1,
      skip: true,
    });

    const OWN_SIGN = new Set([
      '孫師傅牛肉拉麵',
      '茶學苑 Tea Arts',
      '早啊早餐店',
      '新時代眼鏡',
      '得正',
      'mymyfood麥麥屋 24H無人拉麵',
      '天一打字行',
      '經典數位印刷',
      '麻友趣',
      '藍色美而美',
      '陽光煎匙',
      '吉野烤肉飯',
      '原泰阿杜 音樂餐酒館',
      '餡實餃色',
      '桃園中壢大三元麻將會館',
      "丸冰 maru's ice",
      '薰衣草-韓式海苔飯捲',
      '瑞麟美而美',
      '沐樂食堂',
      '墨爾漢堡',
      '晨食司控',
      '8 Code鬆餅',
      '功夫温泉',
      '桌弄',
      'Carousel旋轉木馬兒童服飾',
      '川督極品麻辣臭豆腐',
      '享玩桌遊',
      'AS艾拾金耳采耳專門店',
      '州味涼麵',
      '福祿壽囍鯛魚燒',
      '德式披薩',
      '六季鮮魚湯',
      '熊樂火鍋',
      '一起開丼&Ms.mo 奶酪小姐',
      '漢堡邦',
      '宜珍快餐',
      '艾修通訊',
      '中福鍋燒麵',
      'Master Of Tea 花茶大師',
      '艾尚豆花',
      '食麪',
      '找個地方cafe',
      '咖喱就好啦',
      '全家便利商店',
      '星巴克',
    ]);
    for (const n of zoneOwnSigns()) OWN_SIGN.add(n);
    for (const p of data.pois) if (OWN_SIGN.has(p.name)) p.noSign = true;

    const M = MCD_SPEC;
    const reserved = [
      imFootprint(),
      yhFootprint(),
      garryOutline(YH_SPEC),
      clubFootprint(),
      [
        [M.x0, M.z0],
        [M.x1 + 5, M.z0],
        [M.x1 + 5, M.z1 + 2],
        [M.x0, M.z1 + 2],
      ],
      ...GUARD_SPECS(data).map(guardFootprint),
      mainGateLawn(),
      MAIN_GATE.forecourt,
    ];
    reserved.push(...zoneFootprints(data));
    zonesTerrain(data);

    const keep = [];
    for (const s of GUARD_SPECS(data)) {
      if (s.main) {
        keep.push(...mainGateKeep());
        continue;
      }
      const c = Math.cos(s.ang),
        sn = Math.sin(s.ang),
        w = (x, z) => ({ x: s.x + x * c - z * sn, z: s.z + x * sn + z * c });
      keep.push({ ...w(4.2, 3.6), r: 3 }, { ...w(6.7, 3.6), r: 4.5 });
    }
    {
      const g = data.pois.find((p) => p.name === '舊校門') || { x: -231, z: 39 };
      keep.push({ x: g.x, z: g.z, r: 18 });
    }

    await stage('renderer-and-sky', 0.05, '初始化渲染管線');
    const r = (this.renderer = new THREE.WebGLRenderer({
      antialias: !this.lowQ,
      powerPreference: 'high-performance',
    }));
    r.setPixelRatio(this._pixelRatio());
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = this.lowQ ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.domElement.id = 'game';
    this.bootDiag.attachCanvas(r.domElement);
    document.getElementById('app').prepend(r.domElement);
    this.scene = new THREE.Scene();
    installShadowDepth(r, this.scene, () => this.quality !== 'high');
    this.scene.matrixAutoUpdate = false;
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.2, 2600);
    this.camera.layers.enable(LABEL_LAYER); // floating name labels (hidden in photo mode)

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.audio?.setEngine(false, 0);
    });
    addEventListener('resize', () => {
      r.setSize(innerWidth, innerHeight);
      this.post?.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.menuManager.checkRotate();
    });

    this._sky();
    this.post = new PostFX(r, this.scene, this.camera, subQ(this.quality));
    await stage('build-world', 0.08, '搭建中原大學');

    const featureTrees = (() => {
      const { ox, oz, ang, D } = IM_SPEC,
        c = Math.cos(ang),
        s = Math.sin(ang);
      return [
        [5, D + 13, 'rain', 0.85],
        [41, D + 14, 'rain', 0.8],
        [15, D + 7.5, 'palm', 0.9],
        [31, D + 7.5, 'palm', 0.95],
        [-3, D + 9, 'pine', 0.8],
      ].map(([x, z, kind, sc]) => ({ x: ox + x * c - z * s, z: oz + x * s + z * c, kind, s: sc }));
    })();
    featureTrees.push(...zoneTrees());
    this.world = buildWorld(this.scene, data, (p) => setLoad(0.08 + p * 0.7, '搭建中原大學'), {
      reserved,
      keep,
      low: this.lowQ,
      quality: subQ(this.quality),
      featureTrees,
      mainGate: GUARD_SPECS(data)[0],
      vegHide: zoneVegHide(data),
      treeHide: zoneTreeHide(data),
    });
    this.skyline = buildSkyline(this.scene, this.xlowQ ? 40 : this.lowQ ? 70 : 180);
    this._applyQuality();
    await stage('build-interiors', 0.78, '蓋資管系館、麥當勞、警衛室');
    this.interiors = buildInteriors(this.scene, data, this.world.collision, { createCharacter });

    await stage('build-physics', 0.79, '建立物理碰撞世界');
    try {
      this.physStats = buildPhysicsWorld(this.physics, this.world.collision, this.interiors);
    } catch (e) {
      console.warn('物理世界建立失敗，遊戲改用原本的碰撞', e);
      try {
        this.physics.world?.free();
      } catch (_e2) {}
      this.physics.world = null;
    }
    await stage('spawn-entities', 0.82, '召喚同學與機車');
    this.input = new Input(this.renderer.domElement);
    this.audio = new Audio(this.settings);
    this.hud = new HUD(this.world);
    if (this.bootDiag.isSafeMode()) {
      this.hud.toast('已自動啟用低記憶體安全模式，穩定遊玩 3 分鐘後將自動恢復', 'good', 4500);
    }
    this.player = new Player(this.scene);
    this.rig = new CameraRig(this.camera);
    this.fpv = new FirstPerson(this);
    this.rig.fpv = this.fpv;
    this.aimGlow = new AimGlow(this.scene); // golden halo on what the crosshair picked for E
    this._aimRay = { o: this.camera.position, d: new THREE.Vector3(), floor: 0 };
    this.traffic = new Traffic(this.scene, this.world, this.xlowQ ? 8 : this.lowQ ? 14 : 26);
    this.peds = new Peds(this.scene, this.world, this.xlowQ ? 10 : this.lowQ ? 18 : 32);
    this.traffic.viewK = this.peds.viewK = this.viewK;

    {
      const cf = new THREE.Vector3();
      this.traffic.inView = (p) => {
        const c = this.camera.position,
          dx = p.x - c.x,
          dz = p.z - c.z,
          d = Math.hypot(dx, dz);
        if (d > 150) return false;
        if (d < 4) return true;
        this.camera.getWorldDirection(cf);
        const l = Math.hypot(cf.x, cf.z) || 1;
        return (dx * cf.x + dz * cf.z) / (d * l) > Math.cos(1.22);
      };
    }
    this.peds.inView = this.traffic.inView;
    this.traffic.peds = this.peds;
    this.vehicles = [];
    this.npcs = [];
    this.votes = 0;
    this.ballotsTaken = 0;
    this.clock = 17 * 60 + 20;
    this.playTime = 0;
    this.money = 200;
    this.ledger = [{ what: '媽媽給的零用錢', n: 200, at: this.clock }];
    this.hud.setMoney(this.money);

    this.phone = new Phone(this);
    this.job = new McShift(this);
    this.gate = new GateDuty(this);
    this.race = new Race(this);
    this.pc = new PC(this);
    this.detective = new Detective(this);
    this.wardrobe = new Wardrobe(this);
    this.nav = new Nav(this);
    this.airdrop = new Airdrop(this);
    this.drone = new Drone(this);
    this.photo = new PhotoMode(this);
    this.market = new Market(this);
    this.news = new NewsDesk(this);
    this.library = new LibraryLink(this);
    this.gordon = new Gordon(this);
    this.friends = new Friends(this);
    this.customNpcs = new CustomNpcs(this);
    this.hank = new Hank(this);
    this.concerts = new Concerts(this);
    this.tea = new TeaShop(this);

    this.hud.onPin = (p) => {
      if (p) this.nav.set(p.x, p.z);
      else this.nav.clear();
      $('bmClear')?.classList.toggle('hidden', !this.nav.target);
    };
    onClick('bmClose', () => this.closeMap());
    onClick('bmClear', () => {
      this.nav.clear();
      $('bmClear').classList.add('hidden');
    });

    this.input.padDriving = () => !!this.player.vehicle;
    this.input.padContext = () =>
      this.race.state === 'results'
        ? 'race'
        : this.hud.bigOpen
          ? 'map'
          : this.phone.open
            ? 'phone'
            : this.gate.active
              ? 'gate'
              : this.job.active
                ? 'job'
                : this.mahjong?.playing
                  ? 'mahjong'
                  : 'play';
    this.prompts = new Prompts(this.input, () => ({
      ctx: this.input.padContext(),
      vehicle: !!this.player.vehicle,
    }));
    this.hud.keyLabel = (kb, pad) => (this.prompts.pad ? this.prompts.label(pad) : kb);
    this.input.onDevice = (d, id) => this.prompts.setPad(d === 'pad', id);
    this.input.onPad = (on, id) => {
      if (on) {
        this.prompts.setPad(true, id);
        this.hud.toast(
          `🎮 搖桿已連線：左搖桿移動、右搖桿視角、${this.prompts.label('A')} 互動／對話`,
          'good',
          3200
        );
      } else {
        this.input._use('kb');
        this.hud.toast('🎮 搖桿已中斷', 'bad', 3200);
      }
    };

    this.eggs = (this.data.eggs || []).map((e) => ({ ...e, found: false }));
    for (const n of ['資訊管理學系', '鐘塔', '學生活動中心', '張靜愚紀念圖書館', '全人教育村']) {
      const it = this.world.named[n];
      if (!it) continue;
      const rp = this.world.nearestRoadPoint(it.x, it.z);
      if (!rp) continue;
      const half = (rp.road.w || 4) / 2 + 3.5;
      for (const side of [1, -1]) {
        const x = rp.x + Math.cos(rp.dir) * half * side,
          z = rp.z - Math.sin(rp.dir) * half * side;
        if (this.world.isFree(x, z, 3.2)) {
          this.world.addBoard(
            x,
            z,
            rp.dir + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI,
            0.8
          );
          break;
        }
      }
    }
    {
      const nm = this.world.nightMarket;
      if (this.world.isFree(nm.x + 4, nm.z, 3)) this.world.addBoard(nm.x + 4, nm.z, 0, 0.8);
    }

    this.vehicleSpawner.spawnParked();
    Vehicle.knock = (o, by, nx, nz, impact) =>
      this.vehicleSpawner.knockVehicle(o, by, nx, nz, impact);
    Vehicle.knockTraffic = (o, by, nx, nz, impact) =>
      this.vehicleSpawner.knockTraffic(o, by, nx, nz, impact);

    const rag = /[?&]noragdoll\b/.test(location.search)
      ? null
      : (ch, vel, spin, opt) => Ragdoll.start(this.physics, ch, vel, spin, opt);
    this.player.ragdoll = this.peds.ragdoll = this.traffic.ragdoll = rag;
    this.player.walker = /[?&]oldwalk\b/.test(location.search) ? null : Walker.attach(this.physics);
    Vehicle.onRide = (v, on) => {
      if (on && this.physics.ready && !/[?&]arcadecar\b/.test(location.search) && !v.body) {
        this.physics.dropMover(v);
        this.physics.dropMover(this.player);
        Chassis.attach(this.physics, v);
      } else if (!on && v.body) v.body.remove();
    };

    this._ballots();
    this._beam();

    const gate = data.pois.find((p) => p.name === '舊校門') || { x: -231, z: 39 };
    const im = this.world.named['資訊管理學系'];
    const near = this.world.nearestRoadPoint(gate.x + 6, gate.z + 2);
    const sx = near ? near.x : gate.x + 6,
      sz = near ? near.z : gate.z;
    this.player.place(sx, sz, Math.atan2(im.x - sx, im.z - sz));
    this.startPos = { x: sx, z: sz, h: this.player.heading };
    this.rig.yaw = this.player.heading;
    this.myScooter = this.spawnScooterNear(sx, sz, false, true);

    await stage('init-npcs', 0.95, '準備出發');
    this.missions = new Missions(this);
    this.sunday = new Sunday(this);
    this.clubMembers = new ClubMembers(this);
    this.garry = new Garry(this);
    this.jianyu = new Jianyu(this);
    this.mingshan = new Mingshan(this);
    this.yeeming = new YeeMing(this);
    this.serviceName = serviceName; // 義務役 name prefix, for the phone (src/world/Locate.js)
    // the three developers in 力行 (src/entities/npcs/DevNPC.js)
    this.houshe = new Houshe(this);
    this.richard = new Richard(this);
    this.howard = new Howard(this);
    // 品漢堡 in 278 (劍玉's roommate) and his car errand (src/entities/npcs/PinHan.js, src/systems/quests/PinHanCar.js)
    this.pinhan = new PinHan(this);
    this.pinhanCar = new PinHanCar(this);
    this.pinhanRide = new PinHanRide(this); // 漢堡車: his free ride once a day (src/systems/minigames/PinHanRide.js)
    this.ruizhe = new Ruizhe(this); // 瑞哲 in 278 (bed 5, the middle desk on the left; src/entities/npcs/Ruizhe.js)
    // 吱吱's day in 力行 276 / the two BW'S, and the 武嶺 side quest (src/entities/npcs/Zz.js, src/systems/quests/ZzInjury.js)
    this.zzQuest = new ZzInjury(this);
    this.tzuyuQuest = new TzuyuWagyu(this); // 支線「幫 Winter 帶和牛」(src/systems/quests/TzuyuWagyu.js)
    this.zz = new Zz(this);
    // 吱吱's girlfriend Yulu (商設館 / after-dinner walks) and her errand (src/entities/npcs/Yulu.js, src/systems/quests/YuluTea.js)
    this.yulu = new Yulu(this);
    this.yuluQuest = new YuluTea(this);
    // 力行 277 寢的迷你麻將桌：揪力行的人打台式麻將（src/systems/mahjong/Mahjong.js）
    this.mahjong = new DormMahjong(this);

    await stage('compile-shaders', 0.98, '預編譯著色器');
    // bake the sky environment map before precompiling: setting scene.environment changes the program key of every
    // MeshStandardMaterial, so compiling first would build ~56 programs that are thrown away on the first frame
    this.gameLoop.updateSky(0);
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch (_e) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.menuManager.setup();
    // 設定 → 效能顯示; ?perf forces the developer level for this session
    this.perfHud = new PerfHud(this);
    this.perfHud.setLevel(
      /[?&]perf\b/.test(location.search) ? 'dev' : this.settings.perfHud || 'off'
    );
    if (/[?&]physdebug\b/.test(location.search)) this.physics.enableDebug(this.scene);

    this.last = performance.now();
    this.state = 'title';
    this.titleT = 0;
    setLoad(1, '完成');
    this.bootDiag.complete();
    $('loading').classList.add('hidden');
    $('title').classList.remove('hidden');
    this.gameLoop.start();
  }

  // ---------- delegations ----------
  _pixelRatio() {
    return this.gameLoop.pixelRatio();
  }
  _applyQuality() {
    this.gameLoop.applyQuality();
  }
  setQuality(q) {
    this.gameLoop.setQuality(q);
  }
  modal(title, html, sub = '') {
    this.menuManager.modal(title, html, sub);
  }
  closeModal() {
    this.menuManager.closeModal();
  }
  showControls(fromPause = false) {
    this.menuManager.showControls(fromPause);
  }
  pause() {
    this.menuManager.pause();
  }
  resume() {
    this.menuManager.resume();
  }
  openSettings() {
    this.menuManager.openSettings();
  }
  openVideo() {
    this.menuManager.openVideo();
  }
  closeVideo() {
    this.menuManager.closeVideo();
  }
  toGate() {
    this.menuManager.toGate();
  }
  bringMyScooter(x, z) {
    return this.vehicleSpawner.bringMyScooter(x, z);
  }
  spawnScooterNear(x, z, highlight, jet = false) {
    return this.vehicleSpawner.spawnScooterNear(x, z, highlight, jet);
  }
  _addVehicle(kind, x, z, h, rnd, opt) {
    return this.vehicleSpawner.addVehicle(kind, x, z, h, rnd, opt);
  }
  addVehicle(kind, x, z, h, rnd, opt) {
    return this.vehicleSpawner.addVehicle(kind, x, z, h, rnd, opt);
  }
  _nearestVehicle(r) {
    return this.vehicleSpawner.nearestVehicle(r);
  }
  _throwOff(v) {
    return this.vehicleSpawner.throwOff(v);
  }
  _knockVehicle(o, by, nx, nz, impact) {
    return this.vehicleSpawner.knockVehicle(o, by, nx, nz, impact);
  }
  _knockTraffic(o, by, nx, nz, impact) {
    return this.vehicleSpawner.knockTraffic(o, by, nx, nz, impact);
  }
  _throwVehicle(o, vx, vz, dv, done) {
    return this.vehicleSpawner.throwVehicle(o, vx, vz, dv, done);
  }

  // ---------- sky & lighting ----------
  _sky() {
    this.skySys = new SkySystem(this.scene, this.renderer, subQ(this.quality));
    this.sun = this.skySys.sun;
    this.hemi = this.skySys.hemi;
    this.headlight = new THREE.SpotLight('#fff1d0', 0, 60, 0.55, 0.5, 1.2);
    this.scene.add(this.headlight, this.headlight.target);
    this.playerLight = new THREE.PointLight('#ffd9a0', 0, 18, 1.5);
    this.scene.add(this.playerLight);
  }

  _ballots() {
    const rnd = mulberry32(34),
      w = this.world;
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 80;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffcc33';
    g.fillRect(0, 0, 64, 80);
    g.strokeStyle = '#a66b00';
    g.lineWidth = 6;
    g.strokeRect(3, 3, 58, 74);
    g.fillStyle = '#7a3d00';
    g.font = '900 40px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('票', 32, 42);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: '#ffb300',
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });
    const geo = new THREE.BoxGeometry(0.7, 0.9, 0.1);
    this.ballotList = [];
    const spots = [];
    for (const [_n, it] of Object.entries(w.named)) {
      if (it.b && !['campus', 'dorm', 'church'].includes(it.b.kind)) continue;
      const p = w.nearestRoadPoint(it.x, it.z);
      if (p) spots.push([p.x, p.z]);
    }
    spots.push([w.nightMarket.x, w.nightMarket.z]);
    while (spots.length < 34) {
      const n = w.walkNodes[Math.floor(rnd() * w.walkNodes.length)];
      if (Math.hypot(n.x, n.z - 60) > 520) continue;
      if (spots.some((s) => Math.hypot(s[0] - n.x, s[1] - n.z) < 40)) continue;
      spots.push([n.x, n.z]);
    }
    const final = [];
    for (const s of spots)
      if (!final.some((f) => Math.hypot(f[0] - s[0], f[1] - s[1]) < 12)) final.push(s);
    while (final.length < 34) {
      const n = w.walkNodes[Math.floor(rnd() * w.walkNodes.length)];
      if (
        Math.hypot(n.x, n.z - 60) < 600 &&
        !final.some((f) => Math.hypot(f[0] - n.x, f[1] - n.z) < 25)
      )
        final.push([n.x, n.z]);
    }
    final.slice(0, 34).forEach(([x, z], i) => {
      const y0 = surfaceAt(x, z) + 1.3;
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y0, z);
      m.castShadow = true;
      this.scene.add(m);
      this.ballotList.push({ x, z, y0, mesh: m, taken: false, ph: i });
    });
  }

  _beam() {
    const g = new THREE.CylinderGeometry(1, 1, 80, 24, 1, true);
    g.translate(0, 40, 0);
    const m = new THREE.MeshBasicMaterial({
      color: '#ffd23f',
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.beams = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(g, m);
      b.visible = false;
      this.scene.add(b);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: '#ffd23f',
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      ring.position.y = 0.25;
      b.add(ring);
      this.beams.push(b);
    }
  }

  setBeam(target, radius = 7, extra = []) {
    const list = target ? [target, ...extra] : [];
    this.beams.forEach((b, i) => {
      const t = list[i];
      b.visible = !!t;
      if (t) {
        b.position.set(t.x, surfaceAt(t.x, t.z), t.z);
        b.scale.set(radius * (i ? 0.6 : 1), 1, radius * (i ? 0.6 : 1));
      }
    });
  }

  // ---------- gameplay helpers ----------
  after(fn, ms) {
    (this.timers || (this.timers = [])).push({ t: ms / 1000, fn });
  }

  _tickTimers(dt) {
    if (!this.timers || !this.timers.length) return;
    const due = [];
    this.timers = this.timers.filter((tm) => {
      tm.t -= dt;
      if (tm.t <= 0) {
        due.push(tm.fn);
        return false;
      }
      return true;
    });
    due.forEach((f) => f());
  }

  addVotes(n, msg) {
    this.votes = Math.max(0, this.votes + n);
    this.hud.setVotes(this.votes);
    if (msg) this.hud.toast(msg, n >= 0 ? 'good' : 'bad');
    if (n > 0) this.audio.vote();
    else this.audio.bad();
    const el = $('voteNum');
    if (el) {
      el.style.transform = 'scale(1.35)';
      setTimeout(() => (el.style.transform = ''), 150);
    }
  }

  dialog(lines, cb) {
    this.hud.dialog(lines, cb);
  }

  earn(n, what) {
    this.money += n;
    this.ledger.push({ what, n, at: this.clock });
    this.hud.setMoney(this.money);
    this.audio.coin();
    const el = $('moneyNum');
    if (el) {
      el.style.transform = 'scale(1.3)';
      setTimeout(() => (el.style.transform = ''), 160);
    }
  }

  // like spend(), but the wallet may go below zero (277 麻將 losses, src/systems/mahjong/Mahjong.js)
  pay(n, what) {
    this.money -= n;
    this.ledger.push({ what, n: -n, at: this.clock });
    this.hud.setMoney(this.money);
    this.audio.pay();
  }

  spend(n, what) {
    if (this.money < n) return false;
    this.money -= n;
    this.ledger.push({ what, n: -n, at: this.clock });
    this.hud.setMoney(this.money);
    this.audio.pay();
    return true;
  }

  setMusic(v) {
    this.settings.music = v;
    saveSettings(this.settings);
    this.audio.init();
    this.audio.applyMusic();
  }

  capture(cb) {
    this._shot = cb;
  }

  lockPointer() {
    if (this.state === 'play') lockPointer(this.renderer.domElement);
  }

  // a screen that freed the mouse on purpose is up (results, shops, PC, phone...): losing the pointer lock then is not
  // the player pressing Esc, so it must not pause, and a click on the page must not grab the mouse back. A new screen
  // that calls document.exitPointerLock() and is not a g.modal() belongs in this list.
  mouseOwnedByUI() {
    return (
      this.hud.bigOpen ||
      this._modalOpen ||
      this._overlay ||
      this.videoOpen ||
      this.phone?.open ||
      this.photo?.on ||
      this.job?.active ||
      this.pc?.isOpen ||
      this.wardrobe?.isOpen ||
      this.mahjong?.playing ||
      this.race?.state === 'results'
    );
  }

  openMap(src = 'key') {
    this.mapSrc = src;
    this.hud.toggleBig(true);
    document.exitPointerLock?.();
    $('bmClear')?.classList.toggle('hidden', !this.nav.target);
    this.audio.blip?.();
  }

  closeMap() {
    if (!this.hud.bigOpen) return;
    this.hud.toggleBig(false);
    if (this.mapSrc === 'phone') this.openPhone();
    else if (!this.input.touch && this.state === 'play') lockPointer(this.renderer.domElement);
    this.mapSrc = null;
  }

  canSleep() {
    const m = ((this.clock % 1440) + 1440) % 1440;
    return m >= 21 * 60 || m < 5 * 60;
  }

  sleep() {
    if (this._sleeping || !this.canSleep()) return;
    this._sleeping = true;
    this.audio.setEngine(false, 0);
    let el = $('sleepFade');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sleepFade';
      document.body.appendChild(el);
    }
    el.textContent = '💤 Zzz…';
    el.classList.add('on');
    setTimeout(() => {
      const m = ((this.clock % 1440) + 1440) % 1440,
        day = Math.floor(this.clock / 1440);
      this.clock = (m >= 21 * 60 ? day + 1 : day) * 1440 + 6 * 60;
      this.hud.setClock(this.clock);
      el.textContent = '☀️ 隔天早上 06:00';
      setTimeout(() => {
        el.classList.remove('on');
        this._sleeping = false;
        this.hud.toast('睡飽了！新的一天開始 ☀️', 'good', 2600);
        writeSave(this);
      }, 1700);
    }, 1300);
  }

  openPhone() {
    this.phone.show();
    document.exitPointerLock?.();
  }

  startSpeech(at, cb) {
    const rnd = mulberry32(19);
    const crowd = [];
    const p = this.player.worldPos();
    if (this.player.vehicle) this.player.exit(this.scene, this.world.collision, this.interiors);
    this.audio.setEngine(false, 0);
    this.player.frozen = true;
    const face = Math.atan2(at.x - p.x, at.z - p.z);
    for (let i = 0; i < 22; i++) {
      const a = face + Math.PI + (rnd() - 0.5) * 2.2,
        r = 4 + rnd() * 6;
      const x = this.player.pos.x + Math.sin(a) * r,
        z = this.player.pos.z + Math.cos(a) * r;
      if (!this.world.isFree(x, z, 0.4)) continue;
      const ch = createCharacter(randomStudent(rnd));
      ch.cheerPose = rnd() < 0.5 ? 'cheer' : 'wave';
      ch.root.position.set(x, surfaceAt(x, z), z);
      ch.root.rotation.y = Math.atan2(this.player.pos.x - x, this.player.pos.z - z);
      this.scene.add(ch.root);
      crowd.push(ch);
    }
    this.crowd = crowd;
    {
      const m = ((this.clock % 1440) + 1440) % 1440;
      if (m < 19 * 60) this.clock += 19 * 60 - m;
    }
    this.speechOn = true;
    this.player.heading = face + Math.PI;
    this.rig.yaw = face;
    this.rig.pitch = 0.15;
    this.hud.bigToast('政見發表會', '資管要贏　票投彥霖', 2200);
    this.after(() => {
      this.dialog(SPEECH, () => {
        this.player.setPose('peace', 3);
        this.audio.fanfare();
        this.audio.cheer();
        this.addVotes(20, '全場歡呼！+20 票');
        this.after(() => {
          this.speechOn = false;
          this.player.frozen = false;
          cb();
        }, 2600);
      });
    }, 2200);
  }

  _clearCrowd() {
    if (!this.crowd) return;
    for (const c of this.crowd) this.scene.remove(c.root);
    this.crowd = null;
  }

  showEnding() {
    this.state = 'ending';
    writeSave(this);
    this.audio.setEngine(false, 0);
    this.audio.ending();
    document.exitPointerLock?.();
    const t = Math.floor(this.playTime);
    $('endStats').innerHTML =
      `得票數 <b style="color:#ffd23f;font-size:24px">${this.votes}</b> 票<br>金色選票 ${this.ballotsTaken} / 34　·　遊玩時間 ${Math.floor(t / 60)} 分 ${t % 60} 秒`;
    $('ending').classList.remove('hidden');
  }

  // 準心 (settings.aim, on by default)
  _aim() {
    const el = this._aimEl || (this._aimEl = $('aim'));
    if (!el) return;
    const fp = this.fpv.active,
      dr = !!this.drone?.flying,
      pl = this.player;
    const show =
      this.settings.aim !== 'off' &&
      this.state === 'play' &&
      !this.hud.inDialog &&
      !this.hud.bigOpen &&
      !this._modalOpen &&
      !this._overlay &&
      !this.phone?.open &&
      !this.photo?.on &&
      !this.pc?.isOpen &&
      !this.videoOpen &&
      !this.airdrop.cinema &&
      !this.drone?.cinema &&
      !this.mingshan?.cinema &&
      !this.pinhanRide?.cinema &&
      !this.zzQuest?.busy &&
      !this.mahjong?.playing &&
      !this.job.active &&
      !this.gate.active &&
      !this._sleeping &&
      (dr || fp || !pl.vehicle);
    el.classList.toggle('hidden', !show);
    el.classList.toggle('tp', show && !fp && !dr);
    el.classList.toggle('drone', show && dr);
  }

  _bump() {
    return (
      this._onBump ||
      (this._onBump = (imp) => {
        this.audio.bump(imp / 3, this.player.vehicle?.kind);
        this.rig.cur.y += Math.min(0.3, imp * 0.02);
      })
    );
  }

  _stepPhysics(dt, inp) {
    const ch = this.state === 'play' ? this.player.vehicle?.body : null;
    if (ch) ch.latch(inp);
    if (this.state === 'play') this._physMovers(dt);
    this.physics.update(dt);
    if (ch) ch.frame(dt, this._bump());
    this._physStepped = true;
  }

  _physMovers(dt) {
    const P = this.physics;
    if (!P.ready) return;
    const pl = this.player,
      wp = pl.worldPos(),
      list = [],
      pv = pl.vehicle;
    const veh = (v) =>
      list.push({
        key: v,
        x: v.pos.x,
        y: v.mesh.position.y,
        z: v.pos.z,
        yaw: v.heading,
        r: v.hw,
        hl: v.hl,
        ...(v.kind === 'scooter' ? { cy: 0.5, hh: 0.45 } : { cy: 0.8, hh: 0.75 }),
      });
    if (pv) {
      if (!pv.body) veh(pv);
    } else if (!pl.seat)
      list.push({
        key: pl,
        x: pl.pos.x,
        y: pl.pos.y,
        z: pl.pos.z,
        yaw: 0,
        r: 0.3,
        hl: 0,
        cy: 0.9,
        group: G.CHAR,
      });
    for (const v of [...this.traffic.vehicles(), ...this.race.vehicles()]) {
      if (
        v !== pv &&
        !v.knocked &&
        Math.abs(v.pos.x - wp.x) < 60 &&
        Math.abs(v.pos.z - wp.z) < 60 &&
        v.mesh.visible !== false
      )
        veh(v);
    }
    if (pv?.body) {
      const near = [];
      for (const o of this.vehicles) {
        if (o === pv || o.driver || o.knocked || o.ai || o.racer || o === this.airdrop.run?.v)
          continue;
        const d = Math.hypot(o.pos.x - wp.x, o.pos.z - wp.z);
        if (d < 20) near.push([d, o]);
      }
      near.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < Math.min(12, near.length); i++) veh(near[i][1]);
    }
    P.movers(list, dt);
    P.focus = wp;
  }

  _nearestPed(r) {
    const p = this.player.pos;
    let best = null,
      bd = r;
    for (const q of this.peds.active()) {
      if (q.state === 'down' || !sameLevel(q.y, p.y)) continue;
      const d = Math.hypot(q.pos.x - p.x, q.pos.z - p.z);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  _flyer() {
    const p = this._nearestPed(3.5);
    this.player.setPose('give', 0.5);
    this.audio.paper();
    if (!p) {
      this.hud.toast('附近沒有同學可以發傳單', 'bad', 1000);
      return;
    }
    p.heading = Math.atan2(this.player.pos.x - p.pos.x, this.player.pos.z - p.pos.z);
    this.player.heading = Math.atan2(p.pos.x - this.player.pos.x, p.pos.z - this.player.pos.z);
    const r = this.peds.giveFlyer(p);
    if (r.ok) {
      this.flyerVotes = (this.flyerVotes || 0) + 1;
      this.addVotes(1, `「${r.text}」 +1 票`);
    } else {
      this.hud.toast(`「${r.text}」`, 'bad', 1500);
    }
  }

  _update(dt) {
    const inp = this.input,
      pl = this.player,
      hud = this.hud,
      w = this.world;
    this.playTime += dt;
    if ((this._saveT = (this._saveT || 0) + dt) > 10) {
      this._saveT = 0;
      writeSave(this);
    }
    this.clock += dt / 4;
    this._tickTimers(dt);
    this.phone.tick();
    this.news.tick();
    this.hank.update(dt);
    this.jianyu?.update(dt);
    this.mingshan?.update(dt);
    this.yeeming?.update(dt);
    serviceTick(dt); // 義務役: uniforms on weekdays (src/entities/npcs/Service.js)
    this.houshe?.update(dt);
    this.richard?.update(dt);
    this.howard?.update(dt);
    this.pinhan?.update(dt);
    this.pinhanCar?.update(dt);
    this.ruizhe?.update(dt);
    this.zz?.update(dt);
    this.zzQuest?.update(dt);
    this.tzuyuQuest?.update(dt);
    this.yulu?.update(dt);
    this.yuluQuest?.update(dt);
    this.mahjong?.update(dt);
    hud.update(dt);
    const inDialog = hud.inDialog;
    this.photo.update(dt, inp); // 📷 holding the phone up: eats the shutter / back keys before anything else sees them
    if (inDialog && inp.hit('KeyE', 'Enter', 'NumpadEnter', 'Space', 'Mouse0', 'Tap')) {
      if (hud.advanceDialog()) this.audio.talk();
      inp.pressed.clear();
    }
    if (!this.job.active) this.job.update(dt, inp);
    if (this.job.active && !inDialog) {
      this.job.update(dt, inp);
      inp.pressed.clear();
    } else if (this.gate.active && !inDialog) {
      this.gate.update(dt, inp);
      inp.pressed.clear();
    } else if (this.phone.open) {
      if (this.phone.update(dt, inp) === 'closed' && !this.input.touch && !hud.bigOpen)
        lockPointer(this.renderer.domElement);
      inp.pressed.clear();
    }
    if (inp.hit('KeyM') && !this.phone.open) {
      if (hud.bigOpen) this.closeMap();
      else this.openMap('key');
    }
    if (hud.bigOpen) {
      const v = (420 * dt) / (hud._bigK || 1),
        bv = hud.bigView;
      if (inp.down('KeyA', 'ArrowLeft')) bv.cx -= v;
      if (inp.down('KeyD', 'ArrowRight')) bv.cx += v;
      if (inp.down('KeyW', 'ArrowUp')) bv.cz -= v;
      if (inp.down('KeyS', 'ArrowDown')) bv.cz += v;
      if (inp.hit('Enter', 'NumpadEnter')) {
        const t = this.nav.target,
          k = hud._bigK || 1;
        hud.onPin(
          t && Math.hypot((t.x - bv.cx) * k, (t.z - bv.cz) * k) < 14 ? null : { x: bv.cx, z: bv.cz }
        );
      }
    }
    if (this.mahjong?.playing) {
      // 277 麻將: the table has the keys (its own Esc to leave)
      this.mahjong.play(dt, inp);
      inp.pressed.clear();
    } else if (this.pinhanRide?.cinema) {
      // 漢堡車 (Esc / E skips to the place)
      this.pinhanRide.update(dt, inp);
      inp.pressed.clear();
    } else if (this.zzQuest?.busy) {
      // 吱吱's 武嶺 film (Esc / E skips it) or the bath mini-game (its own keys): nothing else reacts
      if (this.zzQuest.film.active) this.zzQuest.film.update(dt, inp);
      inp.pressed.clear();
    } else if (this.videoOpen) {
      if (inp.hit('Escape', 'KeyE')) this.closeVideo();
      inp.pressed.clear();
    } else if (inp.hit('Escape')) {
      if (hud.bigOpen) this.closeMap();
      // Esc on the race results = 繼續, not the pause menu
      else if (this.race.state === 'results') this.race.close(false);
      else if (!this._modalOpen) {
        document.exitPointerLock?.();
        this.pause();
        return;
      }
    }
    const busy =
      inDialog ||
      this._sleeping ||
      this.airdrop.cinema ||
      this.drone.active ||
      this.mingshan?.cinema ||
      this.pinhanRide?.cinema ||
      this.zzQuest?.busy ||
      this.mahjong?.playing ||
      this.speechOn ||
      hud.bigOpen ||
      this.videoOpen ||
      this.job.active ||
      this.gate.active ||
      this.race.locked ||
      this.pc.isOpen ||
      this.wardrobe.isOpen ||
      this._modalOpen;
    pl.frozen = busy || this.phone.open;
    const phoneDrive =
      this.phone.open &&
      !busy &&
      !!pl.vehicle &&
      !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '');
    this.drone.doors(dt);

    // E target: among the reachable actions, the one nearest the crosshair (src/world/Kit.js actionAt)
    const ray = this._aimRay;
    this.camera.getWorldDirection(ray.d);
    ray.floor = pl.pos.y - pl.y;
    const act =
      !pl.vehicle && !inDialog ? this.interiors.actionAt(pl.pos.x, pl.pos.z, pl.y, ray) : null;
    this.aimGlow.update(act && !pl.frozen ? this.interiors.aimPt : null, dt);
    if (act && !pl.frozen && inp.hit('KeyE')) {
      this.audio.interact();
      act.fn(this);
      inp.pressed.delete('KeyE');
    }
    if (pl.seat && !act && inp.hit('KeyE')) {
      pl.standUp();
      this.audio.interact();
    } else if (!act && !pl.seat && !inDialog && !pl.frozen && inp.hit('KeyE')) {
      this.openPhone();
      inp.pressed.delete('KeyE');
    }

    if (
      !pl.frozen &&
      !pl.seat &&
      !pl.tumble &&
      (pl.vehicle || pl.y - (pl.ground || 0) < 1) &&
      inp.hit('KeyF')
    ) {
      if (pl.vehicle) {
        if (Math.abs(pl.vehicle.speed) < 6) {
          this.audio.engineStop(pl.vehicle.kind);
          pl.exit(this.scene, w.collision, this.interiors);
          this.audio.setEngine(false, 0);
          this.audio.mount();
        } else hud.toast('先減速才能下車！', 'bad');
      } else {
        const v = this._nearestVehicle(3.2),
          locked = v?.lock?.();
        if (locked) hud.toast(locked, 'bad', 2800);
        else if (v) {
          if (v.ai !== null && v.ai !== undefined) {
            this.traffic.hijack(v);
            this.vehicles.push(v);
            hud.toast(
              v.kind === 'scooter'
                ? '同學，機車借一下！'
                : v.model
                  ? '這台超跑是劍玉借給同學的……借一下！'
                  : '不好意思，借一下車！',
              'bad'
            );
          }
          pl.enter(v);
          this.audio.mount();
          this.audio.engineStart(v.kind);
          if (v.hint) {
            v.mesh.remove(v.hint);
            v.hint = null;
          }
          hud.setTip(
            v.kind === 'scooter' ? '🛵 騎車' : '🚗 開車',
            dual(
              '<kbd>W</kbd> 油門 <kbd>S</kbd> 煞車/倒車 <kbd>A</kbd><kbd>D</kbd> 轉向<br><kbd>Space</kbd> 甩尾 <kbd>H</kbd> 喇叭 <kbd>F</kbd> 下車',
              '{RT} 油門 {LT} 煞車/倒車 {L} 轉向<br>{RB} 甩尾 {LB} 喇叭 {B} 下車'
            )
          );
        }
      }
    }

    if (pl.vehicle) {
      const v = pl.vehicle;
      const a = phoneDrive
        ? {
            x: (inp.down('KeyD') ? 1 : 0) - (inp.down('KeyA') ? 1 : 0),
            y: (inp.down('KeyW') ? 1 : 0) - (inp.down('KeyS') ? 1 : 0),
          }
        : pl.frozen
          ? { x: 0, y: 0 }
          : inp.axis();
      const others = [
        ...this.traffic.vehicles(),
        ...this.race.vehicles(),
        ...this.vehicles.filter(
          (o) => o !== v && Math.hypot(o.pos.x - v.pos.x, o.pos.z - v.pos.z) < 10
        ),
      ];
      const vin = { throttle: a.y, steer: -a.x, handbrake: !pl.frozen && inp.down('Space') };
      if (v.body) this._stepPhysics(dt, vin);
      else v.drive(dt, vin, w.collision, others, this._bump());
      pl.ch.update(dt, { mode: v.kind === 'scooter' ? 'ride' : 'drive' });
      const sp = Math.abs(v.speed);
      if (sp > 3) {
        for (const p of this.peds.active()) {
          const b = bodyGap(v, p.pos.x, p.pos.z);
          if (b.gap < 0.35 && sameLevel(p.y, v.mesh.position.y)) {
            const [fx, fz] = v.forward(),
              sg = Math.sign(v.speed) || 1,
              ox = p.pos.x - b.qx,
              oz = p.pos.z - b.qz,
              ol = Math.hypot(ox, oz) || 1;
            let dx = fx * sg + (ox / ol) * 0.4,
              dz = fz * sg + (oz / ol) * 0.4;
            const dl = Math.hypot(dx, dz) || 1;
            dx /= dl;
            dz /= dl;
            if (this.peds.knock(p, dx, dz, sp)) {
              this.audio.hitPed();
              this.addVotes(-1, '撞到同學了！-1 票 😵');
              v.speed *= v.kind === 'scooter' ? 0.55 : 0.8;
            }
          }
        }
      }
      if (v.crash && v.kind === 'scooter') {
        this._throwOff(v);
        return;
      }
      if (!pl.frozen && inp.hit('KeyH')) {
        this.audio.horn(v.kind === 'scooter' ? 1.3 : 1);
        this.peds.scare(v.pos.x, v.pos.z, 14);
      }
      this.audio.setEngine(true, Math.min(1, sp / v.maxSpeed), v.kind);
      this.audio.skid(v.drifting ? Math.min(1, sp / 14) : 0);
      hud.setSpeed(sp * 3.6);
      const [fx, fz] = v.forward();
      this.headlight.intensity = this.night * 60;
      this.headlight.position.set(v.pos.x + fx * 1.2, v.mesh.position.y + 1.1, v.pos.z + fz * 1.2);
      this.headlight.target.position.set(
        v.pos.x + fx * 15,
        surfaceAt(v.pos.x + fx * 15, v.pos.z + fz * 15),
        v.pos.z + fz * 15
      );
    } else {
      pl.updateFoot(dt, inp, this.rig.yaw, w.collision, this.interiors);
      if (pl.sfx) {
        const k = pl.sfx;
        pl.sfx = null;
        if (k === 'step')
          pl.y > 0.3 || this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y)
            ? this.audio.step('in', pl.speed > 6)
            : this.audio.step(w.greenAt?.(pl.pos.x, pl.pos.z) ? 'grass' : 'out', pl.speed > 6);
        else if (k === 'jump') this.audio.jump();
        else if (k === 'land') this.audio.land(pl.landImpact);
      }
      if (!pl.rag) {
        for (const v of [...this.vehicles, ...this.traffic.vehicles()]) {
          if (Math.abs(pl.pos.x - v.pos.x) > v.hl + 1 || Math.abs(pl.pos.z - v.pos.z) > v.hl + 1)
            continue;
          const b = bodyGap(v, pl.pos.x, pl.pos.z),
            rr = v.hw + 0.35;
          if (b.gap < 0.35) {
            const dx = pl.pos.x - b.qx,
              dz = pl.pos.z - b.qz,
              d = Math.hypot(dx, dz);
            if (d > 1e-4) {
              pl.pos.x = b.qx + (dx / d) * rr;
              pl.pos.z = b.qz + (dz / d) * rr;
            }
          }
        }
      }
      hud.setSpeed(null);
      this.headlight.intensity = 0;
      if (!pl.frozen && !pl.seat && !pl.tumble && inp.hit('Mouse0')) this._flyer();
      if (this.concerts?.player && inp.hit('KeyU')) this.concerts.toggleMute();
      if (!pl.frozen && inp.hit('KeyG')) {
        pl.setPose('peace', 1.6);
        this.audio.pop();
      }
    }
    this.playerLight.intensity = this.night * 6;
    const wp = pl.worldPos();
    this.playerLight.position.set(
      wp.x,
      (pl.vehicle ? pl.vehicle.mesh.position.y : surfaceAt(wp.x, wp.z) + pl.y) + 3,
      wp.z
    );

    if (!pl.vehicle && !pl.frozen && !pl.tumble) {
      const v = pl.y - (pl.ground || 0) < 1 && !pl.seat ? this._nearestVehicle(3.2) : null;
      const p = this._nearestPed(3.5);
      if (act) hud.setPrompt(act.label(this));
      else if (v)
        hud.setPrompt(
          v.lock?.()
            ? `🔒 ${v.label}`
            : `按 <kbd>F</kbd> ${v.ai ? '借用' : v.kind === 'scooter' ? '騎上' : '開'}${v.label}`
        );
      else if (p && !p.voted)
        hud.setPrompt(`${this.input.touch ? '按 📄' : '<kbd>左鍵</kbd>'} 發傳單給同學`);
      else hud.setPrompt(null);
    } else hud.setPrompt(null);

    const fw = this.drone.flying ? this.drone.pos : wp;
    const info = {
      pos: fw,
      vehicle: pl.vehicle,
      extraObstacles: [
        ...this.vehicles.filter(
          (v) => v !== pl.vehicle && Math.hypot(v.pos.x - wp.x, v.pos.z - wp.z) < 25
        ),
        ...this.race.vehicles(),
      ],
    };
    this.traffic.update(dt, info, this.audio);
    this.peds.update(dt, { pos: fw, vehicle: pl.vehicle }, w.collision);
    this.race.update(dt);
    this.audio.ambient(dt, {
      x: wp.x,
      z: wp.z,
      yaw: this.rig.yaw,
      night: this.night,
      indoor: !pl.vehicle && !!this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y),
      market: w.nightMarket,
      crowd: this.speechOn,
      job: this.job.active,
      timed: this.missions.timer !== null || this.race.active,
    });
    for (const n of this.npcs) {
      n.ch.update(dt, { speed: 0, pose: n.pose });
      n.mark.position.y = 2.75 + Math.sin(this.time * 3) * 0.08;
    }
    if (this.crowd)
      for (const c of this.crowd)
        c.update(dt, { speed: 0, pose: this.speechOn ? c.cheerPose : null });

    for (const b of this.ballotList) {
      if (b.taken) {
        b.respawn -= dt;
        if (b.respawn <= 0) {
          b.taken = false;
          b.mesh.visible = true;
          b.mesh.scale.setScalar(0.01);
          b.grow = 0;
        }
        continue;
      }
      if (b.grow !== undefined && b.grow < 1) {
        b.grow = Math.min(1, b.grow + dt * 2.5);
        b.mesh.scale.setScalar(Math.max(0.01, b.grow));
      }
      if (Math.hypot(b.x - wp.x, b.z - wp.z) < (pl.vehicle ? 2.6 : 1.6) && pl.y < 2) {
        b.taken = true;
        b.mesh.visible = false;
        b.respawn = 120;
        this.audio.pickup();
        if (!b.got) {
          b.got = true;
          this.ballotsTaken++;
          hud.setBallots(this.ballotsTaken);
          this.addVotes(1, `金色選票 ${this.ballotsTaken}/34 +1 票`);
          if (this.ballotsTaken === 34) {
            hud.bigToast('全部收集！', '34 張金色選票 → 資管要贏 票投彥霖！');
            this.audio.fanfare();
            this.addVotes(34);
          }
        } else this.addVotes(1, '重生的金色選票 +1 票（2 分鐘後再生）');
      }
    }
    if (!this.race.active) this.missions.update(dt);
    this.sunday.update(inp);
    this.nav.update(dt);
    this.airdrop.update(dt);
    this.market.update();

    const btBusy = !$('bigToast').classList.contains('hidden');
    for (const e of this.eggs) {
      if (e.found || btBusy || Math.hypot(e.x - wp.x, e.z - wp.z) > e.r) continue;
      e.found = true;
      hud.bigToast(e.title, e.text, 4200);
      this.audio.pickup();
    }

    if (inp.hit('KeyV') && !this.phone.open && !hud.inDialog && !hud.bigOpen && !this._modalOpen)
      this.fpv.toggle();
    this.rig.update(
      dt,
      hud.bigOpen ? { mdx: 0, mdy: 0 } : inp,
      pl,
      w.collision,
      this.settings.sens,
      this.interiors
    );
    this.fpv.update(dt);
    if (this.job.active) this.job.camera(this.camera, dt);
    else if (this.gate.active) this.gate.camera(this.camera, dt);
    if (this.airdrop.cinema) this.airdrop.camera(this.camera, dt);
    this.drone.update(dt, inp);
    this.drone.camera(this.camera, dt);
    this.mingshan?.camera(this.camera, dt);
    this.pinhanRide?.camera(this.camera, dt);
    this._aim();
    hud.setClock(this.clock);
    const markers = [...this.missions.markers, ...this.race.markers()];
    if (this.interiors.yh && !this.missions.hideHome) {
      const d = this.interiors.yh.door;
      markers.push({
        x: d[0],
        z: d[1],
        icon: '🏠',
        color: '#ff8fb1',
        label: '彥霖的家',
        near: 120,
      });
    }
    if (this.interiors.gordon) {
      const d = this.interiors.gordon.door;
      markers.push({
        x: d[0],
        z: d[1],
        icon: '🥩',
        color: '#c9a24e',
        label: '戈登肉鋪',
        near: 120,
      });
    }
    if (!this.gate.active) {
      for (const gq of Object.values(this.interiors.gates || {})) {
        const [gx, gz] = gq.k.w(gq.W / 2, gq.D / 2);
        markers.push({ x: gx, z: gz, icon: '🚧', color: '#ff9f0a' });
      }
    }
    const range = pl.vehicle ? 170 : 110;
    const dn = this.drone.flying ? this.drone : null;
    hud.drawMinimap(
      fw.x,
      fw.z,
      dn ? dn.yaw : this.rig.yaw,
      dn ? dn.yaw : pl.worldHeading(),
      dn ? 220 : range,
      markers,
      this.ballotList
    );
    hud.drawBig(fw.x, fw.z, dn ? dn.yaw : pl.worldHeading(), markers, this.ballotList);
    if ((this._locT = (this._locT || 0) - dt) <= 0) {
      this._locT = 0.5;
      const zn = !pl.vehicle && this.interiors.zoneAt(pl.pos.x, pl.pos.z, pl.y);
      hud.setLocation(
        dn
          ? `🛸 ${hud.locationName(fw.x, fw.z)}`
          : zn
            ? zn.floorOf
              ? `${zn.name} ${zn.floorOf(pl.y)}F`
              : zn.name
            : hud.locationName(wp.x, wp.z)
      );
      for (const v of this.vehicles)
        v.mesh.visible =
          v === pl.vehicle ||
          Math.hypot(v.pos.x - fw.x, v.pos.z - fw.z) < (dn ? 260 : 160) * (this.viewK ?? 1);
    }
    if (!pl.vehicle && !this.job.active && this._tipMode !== 'foot') {
      this._tipMode = 'foot';
      hud.setTip(
        '🎮 移動',
        dual(
          '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走路 · 滑鼠 視角 · <kbd>Shift</kbd> 衝刺 · <kbd>Space</kbd> 跳<br><kbd>F</kbd> 上車 · <kbd>E</kbd> 互動／📱手機 · <kbd>左鍵</kbd> 發傳單 · <kbd>G</kbd> ✌ · <kbd>M</kbd> 地圖 · <kbd>Esc</kbd> 設定',
          '{L} 走路 · {R} 視角 · {LS} 衝刺 · {RB} 跳<br>{B} 上車 · {A} 互動／📱手機 · {X} 發傳單 · {Y} ✌ · {View} 地圖 · {Menu} 設定'
        )
      );
    }
    if (pl.vehicle) this._tipMode = 'car';
  }
}

window.game = new Game();
window.game.init().catch((e) => {
  console.error(e);
  window.game?.bootDiag?.fail(e);
  $('loadText').textContent = `載入失敗：${e.message}`;
});
