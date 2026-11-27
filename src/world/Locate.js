// 「定位」App：在地圖上看好友現在在哪裡。勞大一開始就在名單上；吱吱、女拳大帝、漢克要先認識並加好友才會出現。
// 每個人的位置是即時的：吱吱在體育館門口或茶學苑上班、女拳大帝在戈登肉鋪櫃台、漢克在麥當勞值班／背吉他散步／
// 騎 ZMAX 兜風（離你太遠時只知道在附近道路）／睡覺（離線），勞大在校園散步、在體育園區籃球場打球或開直升機。可以一鍵導航過去。
const esc = (t) =>
  String(t).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

// navigate to a friend and keep the route on them as they move (nav.track re-routes when they have moved a few
// metres; once their position is unknown — gone home, out of range — the pin stays where they were last seen)
export function trackFriend(g, id) {
  const f0 = friendLocations(g).find((x) => x.id === id);
  if (!f0 || f0.x == null || !g.nav) return false;
  return g.nav.track({
    navPos: () => {
      const f = friendLocations(g).find((x) => x.id === id);
      return f && f.x != null ? { x: f.x, z: f.z } : null;
    },
    navArrive: `📍 找到${f0.name}了！`,
  });
}

// [{ id, name, av (html), color, x, z (or null), status }]
export function friendLocations(g) {
  const out = [],
    F = g.friends,
    has = (id) => F?.added.has(id);
  const add = (id, name, av, color, p0, status0) => {
    // 在 277 打麻將（src/systems/mahjong/Mahjong.js）：不管作息怎麼說，人在牌桌
    const mj = g.mahjong?.where(id),
      p = mj ? mj.pos : p0,
      status = mj ? mj.status : status0;
    out.push({
      id,
      name: g.serviceName ? g.serviceName(id, name) : name,
      av,
      color,
      x: p ? p.x : null,
      z: p ? p.z : null,
      status,
    }); // 義務役: the prefix while serving (src/entities/npcs/Service.js, via Game)
  };
  // 勞大: always (the pilot of 彥霖航空)
  const A = g.airdrop,
    w = A?.walker;
  if (A?.busy && A.H?.g)
    add('laoda', '勞大', '🚁', '#552583', A.H.g.position, '開直升機中（空運機車）');
  else if (w?.on)
    add(
      'laoda',
      '勞大',
      w.grudge ? '💢' : w.mode === 'court' ? '🏀' : '🚁',
      '#552583',
      w.pos,
      w.grudge
        ? '正在衝過去找你（你罵了他）'
        : w.mode === 'court'
          ? '在體育園區籃球場打球'
          : '在校園散步'
    );
  else add('laoda', '勞大', '🚁', '#552583', null, '不在校園（可能在停機坪）');
  if (has('zz')) {
    // his day: src/entities/npcs/Zz.js
    const Z = g.zz;
    if (Z) add('zz', '吱吱', '🏐', '#7a1f2c', Z.pos(), Z.where());
    else {
      const gym = F.npcs.zz?.ch.root;
      if (gym) add('zz', '吱吱', '🏐', '#7a1f2c', gym.position, '在體育館門口');
    }
  }
  if (has('gd')) {
    const k = F.npcs.gd?.ch.root,
      Gd = g.gordon;
    if (g.zz?.gdOut)
      add(
        'gd',
        '女拳大帝',
        '🛵',
        '#1d1d1f',
        g.zz.cruiser && !g.zz.cruiser.ai.dormant ? g.zz.cruiser.pos : null,
        '跟吱吱騎大A在學校附近兜風'
      );
    else if (Gd?.night)
      add(
        'gd',
        '女拳大帝',
        '🎮',
        '#1d1d1f',
        Gd.dorm?.seat,
        Gd.asleep
          ? Gd.ringing
            ? '在力行宿舍 279 寢睡覺，鬧鐘一直響都沒醒（4 號床，戈登肉鋪 08:00 才開）'
            : Gd.overslept
              ? '在力行宿舍 279 寢睡過頭了（鬧鐘被關掉，戈登肉鋪 08:40 才開）'
              : '在力行宿舍 279 寢睡覺（4 號床，戈登肉鋪 08:00 才開）'
          : '在力行宿舍 279 寢打 LOL（戈登肉鋪 08:00 才開）'
      );
    else add('gd', '女拳大帝', '🥩', '#1d1d1f', k?.position, '在戈登肉鋪顧店（校史館前）');
  }
  if (has('hank')) {
    const H = g.hank;
    if (H) {
      const m = H.mode;
      if (m === 'work')
        add(
          'hank',
          '漢克',
          '🎸',
          '#2b2f3a',
          H.worker?.root.position,
          '在活動中心麥當勞內場炸薯條（到 22:00）'
        );
      else if (m === 'dorm')
        add(
          'hank',
          '漢克',
          '🎸',
          '#2b2f3a',
          H.dorm?.seat,
          H.asleep
            ? '在力行宿舍 279 寢睡覺（2 號床）'
            : H.call
              ? '在力行宿舍 279 寢跟女朋友講電話'
              : '在力行宿舍 279 寢彈吉他'
        );
      else if (m === 'walk' && H.walkOn)
        add('hank', '漢克', '🎸', '#2b2f3a', H.pos, '背著吉他在校園散步');
      else if (m === 'ride' && H.zmax && !H.zmax.ai?.dormant)
        add('hank', '漢克', '🎸', '#2b2f3a', H.zmax.pos, '騎 ZMAX 兜風中');
      else
        add(
          'hank',
          '漢克',
          '🎸',
          '#2b2f3a',
          null,
          m === 'walk' ? '在校園另一頭散步' : '騎 ZMAX 在外面兜風（距離太遠）'
        );
    }
  }
  if (has('garry')) {
    // 黃蓋瑞 (src/entities/npcs/Garry.js)
    const G = g.garry,
      m = G?.mode;
    if (m === 'run') add('garry', '黃蓋瑞', '🎶', '#21486e', G.pos, '在體育園區跑道慢跑');
    else if (m === 'club')
      add('garry', '黃蓋瑞', '🎶', '#21486e', G.pos, '在活動中心 3 樓的古箏社教室');
    else if (m === 'sleep')
      add('garry', '黃蓋瑞', '🎶', '#21486e', G.pos, '在房間睡覺（彥霖隔壁）');
    else if (G) add('garry', '黃蓋瑞', '🎶', '#21486e', G.pos, '在房間（彥霖隔壁）');
  }
  if (has('yeeming')) {
    const Y = g.yeeming;
    if (Y?.mode)
      add(
        'yeeming',
        'YeeMing',
        '🪖',
        '#56643a',
        Y.mode === 'walk' ? (Y.walkOn ? Y.pos : null) : Y.mode === 'volley' ? Y.pos : null,
        Y.where()
      );
  } // YeeMing (src/entities/npcs/Yeeming.js)
  if (has('mingshan')) {
    const S = g.mingshan;
    if (S?.mode)
      add(
        'mingshan',
        '羊明衫',
        '💃',
        '#c2414b',
        S.mode === 'dance' || (S.mode === 'walk' && g.yeeming?.walkOn)
          ? S.pos
          : S.mode === 'work'
            ? S.worker?.root.position
            : null,
        S.where()
      );
  } // 羊明衫 (src/entities/npcs/Mingshan.js)
  if (has('jianyu')) {
    const J = g.jianyu;
    if (J?.mode)
      add(
        'jianyu',
        '劍玉',
        '🏎️',
        '#5d6b8a',
        J.cruising && J.cruiser?.ai?.dormant ? null : J.pos,
        J.where()
      );
  } // 劍玉 (src/entities/npcs/Jianyu.js)
  // the three developers (src/entities/npcs/DevNPC.js)
  for (const [id, name, av, color] of [
    ['houshe', '侯舌', '📷', '#3a3a40'],
    ['richard', '理查', '🕺', '#2f4a32'],
    ['howard', '霍華德', '🃏', '#c9677f'],
    ['pinhan', '品漢堡', '📘', '#3b5b8c'],
    ['ruizhe', '瑞哲', '🐺', '#2f2f31'],
  ]) {
    const D = g[id];
    if (has(id) && D?.mode)
      add(
        id,
        name,
        av,
        color,
        ['date', 'walk', 'ikea', 'con', 'ride'].includes(D.mode) ? null : D.pos,
        D.where()
      ); // out on a date / a walk with his girlfriend / at IKEA / at a 同人場: no pin
  }
  // 吱吱's girlfriend (src/entities/npcs/Yulu.js): a pin only in front of 商設館
  const Y = g.yulu;
  if (has('yulu') && Y?.mode)
    add('yulu', 'Yulu', '🎨', '#c9a24a', Y.mode === 'ssd' ? Y.navPos() : null, Y.where());
  return out;
}

// the app page: a map around you and your friends, and the list with distance and a 導航 button
export function locateUI(root, g) {
  let key = '';
  function render() {
    const L = friendLocations(g),
      p = g.player.worldPos();
    const k = `${L.map((f) => `${f.id}:${f.x == null ? '-' : Math.round(f.x / 3)},${f.z == null ? '-' : Math.round(f.z / 3)}:${f.status}`).join('|')}|${Math.round(p.x / 3)},${Math.round(p.z / 3)}`;
    if (k === key) return;
    key = k;
    const rows = L.map((f) => {
      const d = f.x == null ? null : Math.hypot(f.x - p.x, f.z - p.z);
      const dist =
        d == null ? '—' : d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
      return `<div class="lc-row"><span class="ph-av" style="background:${f.color}">${f.av}</span>
        <span class="lc-main"><b>${esc(f.name)}</b><small>${esc(f.status)}</small></span>
        <span class="lc-side"><small>${dist}</small>${f.x != null ? `<button class="lc-go" data-id="${f.id}">導航</button>` : ''}</span></div>`;
    }).join('');
    const more =
      g.friends &&
      [
        'zz',
        'gd',
        'hank',
        'garry',
        'jianyu',
        'mingshan',
        'yeeming',
        'houshe',
        'richard',
        'howard',
        'yulu',
        'pinhan',
        'ruizhe',
      ].some((id) => !g.friends.added.has(id))
        ? '<div class="lc-note">在校園裡認識新朋友、加好友，他們就會出現在這裡 📍</div>'
        : '';
    root.innerHTML = `<div class="lc"><canvas class="lc-map" width="552" height="420"></canvas><div class="lc-list">${rows}${more}</div></div>`;
    drawMap(root.querySelector('.lc-map'), g, L, p);
    root.querySelectorAll('.lc-go').forEach(
      (b) =>
        (b.onclick = () => {
          const f = friendLocations(g).find((x) => x.id === b.dataset.id);
          if (!f || f.x == null) return;
          trackFriend(g, f.id);
          g.audio.tap?.();
          g.hud.toast(`📍 已導航到 ${f.name}（${f.status}）・路線會跟著移動`, 'good', 2400);
        })
    );
  }
  return { render, refresh: render };
}

// map around everyone shown: the prerendered campus map (hud.mapCanvas), you as a blue dot, friends as pins
function drawMap(cv, g, L, p) {
  const c = cv.getContext('2d'),
    W = cv.width,
    H = cv.height,
    hud = g.hud;
  const pts = [[p.x, p.z], ...L.filter((f) => f.x != null).map((f) => [f.x, f.z])];
  const x0 = Math.min(...pts.map((q) => q[0])),
    x1 = Math.max(...pts.map((q) => q[0])),
    z0 = Math.min(...pts.map((q) => q[1])),
    z1 = Math.max(...pts.map((q) => q[1]));
  const cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    span = Math.max(160, (x1 - x0) * 1.3, ((z1 - z0) * 1.3 * W) / H); // metres across
  const mpp = span / W; // metres per pixel
  c.fillStyle = '#2b2d33';
  c.fillRect(0, 0, W, H);
  if (hud?.mapCanvas) {
    const [mx, mz] = hud.w2m(cx - span / 2, cz - (span * H) / W / 2),
      s = hud.scale;
    c.drawImage(hud.mapCanvas, mx, mz, span * s, ((span * H) / W) * s, 0, 0, W, H);
  }
  const S = (x, z) => [(x - cx) / mpp + W / 2, (z - cz) / mpp + H / 2];
  // friends: a pin with their emoji
  for (const f of L) {
    if (f.x == null) continue;
    const [sx, sy] = S(f.x, f.z);
    c.fillStyle = f.color;
    c.beginPath();
    c.arc(sx, sy - 26, 22, 0, 7);
    c.fill();
    c.beginPath();
    c.moveTo(sx - 9, sy - 10);
    c.lineTo(sx + 9, sy - 10);
    c.lineTo(sx, sy + 2);
    c.closePath();
    c.fill();
    c.strokeStyle = '#fff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(sx, sy - 26, 22, 0, 7);
    c.stroke();
    c.font = '24px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(f.av.startsWith('<') ? '🙂' : f.av, sx, sy - 25);
    c.font = '700 20px "Noto Sans TC","Microsoft JhengHei",sans-serif';
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(0,0,0,.7)';
    c.strokeText(f.name, sx, sy + 18);
    c.fillStyle = '#fff';
    c.fillText(f.name, sx, sy + 18);
  }
  // you
  const [px, py] = S(p.x, p.z);
  c.fillStyle = 'rgba(0,122,255,.25)';
  c.beginPath();
  c.arc(px, py, 22, 0, 7);
  c.fill();
  c.fillStyle = '#007aff';
  c.strokeStyle = '#fff';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(px, py, 10, 0, 7);
  c.fill();
  c.stroke();
  // scale bar
  const bar = 50 / mpp;
  c.fillStyle = 'rgba(0,0,0,.55)';
  c.fillRect(12, H - 34, bar + 16, 24);
  c.fillStyle = '#fff';
  c.fillRect(20, H - 18, bar, 3);
  c.font = '600 15px sans-serif';
  c.textAlign = 'left';
  c.fillText('50 m', 22, H - 26);
}
