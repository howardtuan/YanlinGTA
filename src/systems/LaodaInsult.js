// 彩蛋：罵勞大，他就衝過來肘擊你（src/entities/Pilot.js CampusPilot.provoke）。這裡判斷一句話算不算在罵他：
// 手機訊息（src/ui/phone/Phone.js _send，他的聊天室或別人的聊天室）和當面回嘴（打招呼對話最後的輸入框）都用這個。
// - 種族歧視的字眼一律算，在哪裡說都一樣（全地圖只有他會被這樣叫），中間塞空白也一樣
// - 其他罵人的話：直接對他說（他的聊天室、當面）才算；在別人的聊天室要提到他（勞大、牢大、Kobe、科比…）才算
const SLUR = /黑鬼|黑奴|黑猴|黑猩猩|黑炭|尼哥|尼格|n[i1!]gg|negro/i;
const NAME = /勞大|牢大|劳大|科比|曼巴|小飛俠|黑人|kobe|mamba|lao\s*da/i;
const RUDE = new RegExp(
  [
    '幹你|幹您|操你|草你|靠北|靠杯|靠腰|機掰|雞掰|三小|白[癡痴]|智障|低能|腦殘|北七|(?:^|\\D)87(?:\\D|$)',
    '廢物|廢柴|垃圾|去死|死好|滾開|滾啦|閉嘴|笨蛋|蠢|醜八怪|很醜|好醜|很爛|好爛|爛透|豬頭|王八|混蛋|賤|婊|很廢|超廢|好廢',
    '\\bfuck|\\bshit|stupid|idiot|moron|loser|\\bdumb|trash|\\bsucks?\\b|stfu|bitch',
  ].join('|'),
  'i'
);

// text: what you said; direct: said to him (his chat, face to face) rather than about him somewhere else
export function insultsLaoda(text, direct = false) {
  const t = String(text || '');
  if (!t.trim()) return false;
  if (SLUR.test(t.replace(/\s+/g, ''))) return true;
  return RUDE.test(t) && (direct || NAME.test(t));
}
