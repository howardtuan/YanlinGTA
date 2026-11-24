// 支線「幫品漢堡找一台車」：
//   1. 跟品漢堡（src/entities/npcs/PinHan.js）加好友後，他私訊你：想載大家去 IKEA 買生活用品，但沒有車，
//      請你幫他找一台汽車，開到正門口給他。
//   2. 支線進行中，他 09:00–21:00 在正門口（src/world/MainGateSpec.js 的 forecourt 旁）等。
//   3. 開一台汽車（機車不行；朋友的車也不行，例如劍玉的超跑）到他旁邊，下車，走到他旁邊按 E 把車交給他。
//   4. 他開走那台車（之後大約 3 天有 1 天下午載大家去 IKEA），私訊說以後每天可以免費載你一次、他親自送你，
//      並幫你在手機裝專屬 App「漢堡車」（src/systems/minigames/PinHanRide.js）：選目的地，他馬上開車到你旁邊。
// 進度存在 src/systems/SaveSystem.js 的 pinhanCar。
const NEAR = 10; // metres: the car has to be parked this close to him

export class PinHanCar {
  constructor(game) {
    this.g = game;
    // stage: none → asked (he is waiting at the gate for a car) → done (he has one)
    this.state = { stage: 'none' };
    this.lastCar = null;
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  get waiting() {
    return this.state.stage === 'asked';
  }
  get done() {
    return this.state.stage === 'done';
  }
  _say(lines) {
    const st = this.g.phone?.chats.find((c) => c.c.id === 'pinhan');
    if (!st || st.busy) return false;
    this.g.phone._deliver(
      st,
      lines.map((text) => ({ who: 'pinhan', text })),
      0,
      400
    );
    return true;
  }
  _isCar(v) {
    return !!v && v.kind !== 'scooter' && v.kind !== 'zmax';
  }
  // the car you last drove, parked next to him at the gate, and you on foot
  carHere() {
    const g = this.g,
      v = this.lastCar,
      P = g.pinhan;
    if (!this.waiting || this._giving || !v || v.away || g.player.vehicle || P?.mode !== 'wait')
      return null;
    const s = P.gateSpot;
    return Math.hypot(v.pos.x - s.x, v.pos.z - s.z) < NEAR ? v : null;
  }
  update() {
    const g = this.g,
      S = this.state,
      v = g.player.vehicle;
    if (this._isCar(v)) this.lastCar = v;
    if (S.stage !== 'none' || !g.friends?.added.has('pinhan')) return;
    const ok = this._say([
      '彥霖。',
      '想載大家去 IKEA 買生活用品，可是我沒有車。',
      '可以幫我找一台汽車嗎？開到正門口給我就好。',
      '我早上 9 點到晚上 9 點在正門口等。謝了。',
    ]);
    if (!ok) return;
    S.stage = 'asked';
    g._saveT = 9.5;
    g.hud.toast('🚗 支線：幫品漢堡找一台車 —— 開一台汽車到正門口給他', 'good', 3400);
  }
  // at the gate: hand the car over (src/entities/npcs/PinHan.js wraps his talk action)
  give() {
    const g = this.g,
      v = this.carHere();
    if (!v) return false;
    if (v.owner) {
      g.dialog([
        ['品漢堡', '……這台是劍玉的吧。'],
        ['品漢堡', '借朋友的車不太好。換一台。'],
      ]);
      return true;
    }
    this._giving = true; // he stays at the gate until the talk is over
    g.dialog(
      [
        ['彥霖', '漢堡！車幫你開來了，鑰匙在上面。'],
        ['品漢堡', '……謝了。'],
        ['品漢堡', '這週末載大家去 IKEA，要買什麼跟我說。'],
        ['品漢堡', '以後想去哪，我載你。'],
      ],
      () => {
        // he drives off in it
        this._giving = false;
        this.state.stage = 'done';
        g._saveT = 9.5;
        const i = g.vehicles.indexOf(v);
        if (i >= 0) g.vehicles.splice(i, 1);
        g.scene.remove(v.mesh);
        v.away = true;
        this.lastCar = null;
        g.hud.toast('🚗 品漢堡開著車走了', 'good', 2400);
        this._say([
          '車很好開。謝了。',
          '以後每天可以免費載你一次，我親自送你。',
          '幫你裝了一個 App：漢堡車 🍔',
          '打開選目的地，我馬上開到你旁邊。',
        ]);
        setTimeout(() => {
          g.hud.bigToast?.(
            '📲 已安裝「漢堡車」',
            '每天免費搭一次：打開 App 選目的地，品漢堡親自開車送你'
          );
          if (g.phone?.open && !g.phone.app) g.phone.home();
        }, 2600);
      }
    );
    return true;
  }
}
