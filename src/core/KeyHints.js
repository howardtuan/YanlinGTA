// Key hints that read differently on a gamepad: dual(kbHTML, padHTML). padHTML may contain {A}, {RT},
// {L} (left stick) ... tokens; src/ui/Prompts.js turns them into the connected controller's button glyphs.
// Kept in core/ so that systems/ and entities/ can write hints without importing the ui layer.
export function dual(kb, pad) {
  return `<span class="kb-only">${kb}</span><span class="pad-only">${pad.replace(/\{(\w+)\}/g, (_, n) => `<kbd data-pb="${n}"></kbd>`)}</span>`;
}

// ---- 手機觸控：把「按 M」「<kbd>J</kbd>」這種鍵盤說法換成畫面上的觸控按鈕 ----
// 手機沒有鍵盤，玩家看到的是右下角那排觸控鈕（index.html #touchBtns：F 上下車、E 互動、📄 發傳單、⤒ 跳、» 衝刺、
// 🗺 地圖、📯 喇叭、⚙ 設定）和 S.U.N.D.A.Y 自己的圓圈按鈕。touchHints() 在 body.touch 時改寫提示文字（HTML 或純文字都可以），
// 由 src/ui/HUD.js（任務目標、互動提示、toast、對話）與 src/systems/minigames/Sunday.js 呼叫；桌機原樣不動。
// 鍵 → 觸控鈕上的字（null：手機上沒有對應的鍵，整句改寫見 PHRASES）
export const TOUCH_KEYS = {
  E: 'E',
  F: 'F',
  M: '🗺 地圖',
  H: '📯',
  J: 'S.U.N.D.A.Y',
  Esc: '⚙',
  Space: '⤒',
  Shift: '»',
  滑鼠左鍵: '📄',
  左鍵: '📄',
};
// 先處理的整句（鍵盤和觸控說法差太多的）
const PHRASES = [
  // 對話繼續：手機就是點一下畫面
  [
    /按 ?(<kbd>)?E(<\/kbd>)? ?(或|\/) ?(<kbd>)?Enter(<\/kbd>)?( ?\/ ?點擊畫面)? ?繼續/g,
    '點一下畫面繼續',
  ],
  // 電腦（src/ui/PC.js）在手機上用右下角的 ⏻ 離開
  [/按 ?(<kbd>)?Esc(<\/kbd>)? ?關掉電腦/g, '點右下角 <kbd>⏻</kbd> 離開電腦'],
  // 本來就附註的手機說法，換掉鍵盤說法後就重複了
  [/（手機按 ?📄） ?/g, ' '],
];
const KEY_RE = Object.keys(TOUCH_KEYS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const KBD_PRESS = new RegExp(`按 ?<kbd>(${KEY_RE})</kbd>`, 'g'),
  KBD_ONLY = new RegExp(`<kbd>(${KEY_RE})</kbd>`, 'g'),
  // 純文字（對話框、toast 是 textContent）：「按 M」「按 J 打開」；後面不能緊接英數字，免得吃到「按 Enter」以外的字
  PLAIN = new RegExp(`按 ?(${KEY_RE})(?![A-Za-z0-9])`, 'g');

export const isTouch = () =>
  typeof document !== 'undefined' && !!document.body?.classList.contains('touch');

// s: a hint (HTML or plain text). html: whether the result may carry <kbd> (false for textContent)
export function touchHints(s, html = true, touch = isTouch()) {
  if (!touch || typeof s !== 'string' || !s) return s;
  for (const [re, to] of PHRASES) s = s.replace(re, html ? to : to.replace(/<\/?kbd>/g, ''));
  const k = (key) => TOUCH_KEYS[key];
  s = s.replace(KBD_PRESS, (_, key) => `點 <kbd>${k(key)}</kbd>`);
  s = s.replace(KBD_ONLY, (_, key) => `<kbd>${k(key)}</kbd>`);
  return s.replace(PLAIN, (_, key) => (html ? `點 <kbd>${k(key)}</kbd>` : `點「${k(key)}」`));
}
