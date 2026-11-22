// 自訂 NPC：在開發用的 NPC 儀表板（tools/npc-dashboard）新增的人物，不用改程式就會出現在遊戲裡。
// 讀 data/npcs.json 裡 kind 為 custom、enabled 不是 false 的 NPC，放在他選的出沒地點（places），頭上有名牌；
// 走近按 E 跟他聊天，talks 裡的對話一段一段輪流說（[說話的人, 台詞]，說話的人可以是「彥霖」）。
// 需要作息、店鋪、加好友、手機聊天這些特別行為的 NPC，請照儀表板的「需求單」另外寫程式（像 src/entities/npcs/Hank.js、src/entities/npcs/Garry.js）。
import { makeMissionNpc } from '../NPC.js';

export class CustomNpcs {
  constructor(game) {
    this.g = game; this.list = [];
    this.ready = this.load().catch((e) => console.warn('[customnpcs] data/npcs.json 讀不到', e));
  }
  async load() {
    const res = await fetch('data/npcs.json', { cache: 'no-cache' }); if (!res.ok) return;
    const reg = await res.json(), places = reg.places || {};
    for (const n of reg.npcs || []) {
      if (n.kind !== 'custom' || n.enabled === false) continue;
      const p = places[n.place] || (n.spot && typeof n.spot.x === 'number' ? n.spot : null); if (!p) continue;
      const npc = makeMissionNpc(this.g.scene, { face: true, ...n.look }, n.title ? `${n.title} ${n.name}` : n.name, p.x, p.z, p.h || 0);
      if (n.height && n.height !== 1) npc.ch.root.scale.y = n.height;
      npc.mark.visible = false; // not a story NPC: no "!" over the head
      this.g.npcs.push(npc);
      const me = { n, npc, i: 0 };
      this.list.push(me);
      if (!n.talks?.length) continue;
      this.g.interiors.actions.push({
        x: p.x, z: p.z, r: 2.6, y: 0, anyY: true,
        label: () => `按 <kbd>E</kbd> 和${n.name}聊天`,
        fn: (g) => { const t = n.talks[me.i++ % n.talks.length]; g.dialog(t.map(([w, s]) => [w, s])); },
      });
    }
  }
}
