// 勞大的開關。預設把勞大藏起來：開直升機、在校園散步的是「彥霖航空機長」（src/entities/Pilot.js createCaptain），
// 手機訊息沒有勞大的聊天室（src/ui/phone/Phone.js）、定位 App 沒有他（src/world/Locate.js）、也沒有罵他被肘擊的彩蛋。
// 在電腦的終端機（src/ui/PC.js）輸入 mamba 叫勞大回來，輸入 mamba out 再讓他下班；兩個指令都不會列在 help 裡。
// 存在這台瀏覽器的 localStorage，跟遊戲存檔分開：重新整理、開新遊戲都還記得。
const KEY = 'yanlinGTA.laoda';
let on = null;

export function laodaOn() {
  if (on == null) {
    try {
      on = globalThis.localStorage?.getItem(KEY) === '1';
    } catch {
      on = false; // storage blocked: hidden
    }
  }
  return on;
}

// switch him on / off and let the game catch up (the pilot's model, the phone's chat list); false: it already was
export function setLaoda(v, g = null) {
  v = !!v;
  if (v === laodaOn()) return false;
  on = v;
  try {
    if (v) globalThis.localStorage?.setItem(KEY, '1');
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    // storage blocked: this visit only
  }
  g?.airdrop?.syncPilot?.();
  g?.phone?.syncLaoda?.();
  return true;
}
