// 支線「霍華德的 LeetCode：Two Sum」：解出來才能騎他的黑色忍 400（src/entities/npcs/Howard.js）。
//   1. 跟霍華德加好友之後，面對面跟他聊天（不是傳訊息），他說想騎忍 400 就先解一題，把 LeetCode 經典題 Two Sum 傳到你的電腦。
//   2. 打開電腦（彥霖家、力行 276 的筆電、系館電腦教室都可以，src/ui/PC.js）：桌面多一個「🧩 Two Sum」，第一次打開電腦會自動跳出來。
//   3. 用 Python3 寫 class Solution 的 twoSum，時間複雜度要 O(N)；編輯器不能貼上、不能拖放文字進去（一定要自己打）。
//   4. 按「提交」：Pyodide（src/systems/minigames/Learn.js runPython，跟資管學堂同一個）真的執行批改：
//      - 正確性：題目的三個範例、負數／零／重複數字，加上 60 組隨機測資（答案唯一，回傳的兩個索引順序不限）；
//      - O(N)：先看程式結構（迴圈裡又有迴圈、在迴圈裡用 in 查 list、.index()／.count()、排序 sort／sorted 都不行），
//        再實際量時間（n = 2,000 和 20,000、答案在最後兩個，O(N²) 一定超時）。
//   5. 通過（Accepted）後霍華德私訊恭喜你（訊息 App），忍 400 從此可以按 F 騎；他也在訊息裡說：
//      手機「呼叫載具」可以叫彥霖航空直升機把忍 400 空投過來（src/systems/minigames/Airdrop.js），
//      新中北路障礙賽報名時也可以選騎忍 400（src/systems/minigames/Race.js）。
// 進度（還有你寫到一半的程式）存在 src/systems/SaveSystem.js 的 howardQuest。
import { runPython } from '../minigames/Learn.js';

export const TWO_SUM_STARTER = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        `;

// the judge, in Python: static checks on the syntax tree, the tests, then the timing. Prints one line: __RESULT__{json}
function harness(src, mode) {
  return `
import ast, json, time, random
from typing import List, Optional, Dict, Tuple
__SRC__ = ${JSON.stringify(src)}
__MODE__ = ${JSON.stringify(mode)}
def __judge():
    r = {"ok": False, "cases": [], "bad": []}
    try:
        tree = ast.parse(__SRC__)
    except SyntaxError as e:
        r["err"] = f"語法錯誤：第 {e.lineno} 行，{e.msg}"
        return r
    bad = r["bad"]
    LOOPS = (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp, ast.AsyncFor)
    def walk(node, depth):
        for ch in ast.iter_child_nodes(node):
            d = depth
            if isinstance(ch, LOOPS):
                if depth >= 1:
                    bad.append(f"第 {ch.lineno} 行：迴圈裡面又有迴圈，這是 O(N²)")
                d = depth + 1
            if isinstance(ch, ast.Call):
                f = ch.func
                name = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else "")
                if name in ("sorted", "sort"):
                    bad.append(f"第 {ch.lineno} 行：排序是 O(N log N)，不是 O(N)")
                if name in ("index", "count") and depth >= 1:
                    bad.append(f"第 {ch.lineno} 行：在迴圈裡用 .{name}() 會再掃一次，整體 O(N²)")
            if isinstance(ch, ast.Compare) and depth >= 1 and any(isinstance(o, (ast.In, ast.NotIn)) for o in ch.ops):
                for c in ch.comparators:
                    if isinstance(c, (ast.List, ast.Subscript, ast.Tuple)) or (isinstance(c, ast.Name) and c.id == "nums"):
                        bad.append(f"第 {ch.lineno} 行：在迴圈裡用 in 查 list 是 O(N)，整體 O(N²)；試試 dict")
            walk(ch, d)
    walk(tree, 0)
    ns = {"List": List, "Optional": Optional, "Dict": Dict, "Tuple": Tuple}
    try:
        exec(compile(tree, "<solution>", "exec"), ns)
        S = ns.get("Solution")
        if S is None:
            r["err"] = "找不到 class Solution（照 LeetCode 的格式寫）"
            return r
        f = S().twoSum
    except Exception as e:
        r["err"] = f"{type(e).__name__}: {e}"
        return r
    def check(nums, target, ans):
        if not isinstance(ans, (list, tuple)) or len(ans) != 2:
            return "要回傳兩個索引，例如 [0, 1]"
        i, j = ans
        if not (isinstance(i, int) and isinstance(j, int)):
            return "索引要是整數"
        if i == j or not (0 <= i < len(nums) and 0 <= j < len(nums)):
            return "索引超出範圍，或用了同一個元素兩次"
        if nums[i] + nums[j] != target:
            return f"nums[{i}] + nums[{j}] = {nums[i] + nums[j]}，不等於 {target}"
        return None
    tests = [([2, 7, 11, 15], 9), ([3, 2, 4], 6), ([3, 3], 6)]
    if __MODE__ == "submit":
        tests += [([-1, -2, -3, -4, -5], -8), ([0, 4, 3, 0], 0), ([1, 5, 1, 5], 10), ([-3, 4, 3, 90], 0)]
        rnd = random.Random(34)
        for _ in range(60):
            n = rnd.randint(2, 40)
            vals = rnd.sample(range(-200, 200), n)
            i, j = rnd.sample(range(n), 2)
            target = vals[i] + vals[j]
            # keep the answer unique
            seen = {}
            ok = True
            for k, v in enumerate(vals):
                if target - v in seen and {seen[target - v], k} != {i, j}:
                    ok = False
                    break
                seen[v] = k
            if ok:
                tests.append((vals, target))
    for k, (nums, target) in enumerate(tests):
        try:
            ans = f(list(nums), target)
        except Exception as e:
            r["cases"].append({"k": k, "nums": nums if len(nums) <= 12 else None, "target": target, "err": f"{type(e).__name__}: {e}"})
            return r
        why = check(nums, target, ans)
        if why or k < 3:
            r["cases"].append({"k": k, "nums": nums if len(nums) <= 12 else None, "target": target, "ans": list(ans) if isinstance(ans, (list, tuple)) else repr(ans), "why": why})
        if why:
            return r
    r["passed"] = len(tests)
    if __MODE__ != "submit":
        r["ok"] = True
        return r
    if bad:
        return r
    # timing: the pair is the last two numbers, so a brute force has to look at every pair
    times = []
    for n in (2000, 20000):
        nums = list(range(1, n - 1)) + [10**7, 10**7 + 1]
        target = 2 * 10**7 + 1
        t0 = time.perf_counter()
        ans = f(nums, target)
        dt = time.perf_counter() - t0
        times.append(round(dt * 1000, 1))
        if check(nums, target, ans):
            r["cases"].append({"k": "big", "why": f"n = {n} 的測資答錯了"})
            return r
        # O(N) takes well under a millisecond for 2,000 and a few for 20,000; O(N²) is ~100× / ~1000× that
        if dt > (0.03 if n == 2000 else 0.3):
            r["slow"] = n
            r["times"] = times
            return r
    r["times"] = times
    r["ok"] = True
    return r
__r = __judge()
print("__RESULT__" + json.dumps(__r, ensure_ascii=False))
`;
}

export class HowardTwoSum {
  constructor(game) {
    this.g = game;
    // stage: none → sent (on your computer) → done (Accepted: the 忍 400 is yours to ride)
    this.state = { stage: 'none', code: TWO_SUM_STARTER, tries: 0 };
  }
  toJSON() {
    return this.state;
  }
  load(d) {
    if (d && typeof d === 'object') Object.assign(this.state, d);
  }
  get sent() {
    return this.state.stage === 'sent';
  }
  get done() {
    return this.state.stage === 'done';
  }
  // the 🧩 icon on the desktop (src/ui/PC.js)
  get onPC() {
    return this.state.stage !== 'none';
  }
  // talking to him face to face (src/entities/npcs/Howard.js talk): the first time after you are friends he sends the problem;
  // until you solve it he asks about it instead of the usual talk. true: handled
  offer() {
    const g = this.g;
    if (!g.friends?.added.has('howard') || this.done) return false;
    if (this.state.stage === 'none') {
      g.dialog(
        [
          ['霍華德', '彥霖，想騎我的忍 400 嗎？😏'],
          ['彥霖', '那台黑色的！？可以嗎！'],
          ['霍華德', '先解一題。LeetCode 經典題：Two Sum。'],
          ['霍華德', '用 Python3，時間複雜度要 O(N)。O(N²) 的暴力解我不收。'],
          ['霍華德', '我傳到你電腦了，打開就看得到。自己打，不准複製貼上 🙅'],
        ],
        () => {
          this.state.stage = 'sent';
          g._saveT = 9.5;
          g.audio.notify?.();
          g.hud.toast(
            '🧩 霍華德把 Two Sum 傳到你的電腦了 —— 打開電腦（家裡、力行 276 的筆電或系館電腦教室）',
            'good',
            4200
          );
        }
      );
      return true;
    }
    g.dialog([
      ['霍華德', 'Two Sum 寫好了沒？電腦打開就看得到 🧩'],
      ['霍華德', '提示：只走一次 nums 就要找到答案。'],
    ]);
    return true;
  }
  // run the examples (mode 'run') or the full judge ('submit'); resolves { ok, cases, bad, slow, times, err, out }
  async judge(code, mode = 'run') {
    this.state.code = code;
    const res = await runPython(harness(code, mode));
    const out = res.out || '',
      i = out.lastIndexOf('__RESULT__');
    let r;
    if (i >= 0) {
      try {
        r = JSON.parse(
          out
            .slice(i + 10)
            .trim()
            .split('\n')[0]
        );
      } catch {
        r = { err: '批改結果讀不出來' };
      }
    } else
      r = {
        err: res.timeout
          ? '執行超過 10 秒：一定不是 O(N)（是不是兩層迴圈？）'
          : res.err || '執行失敗',
      };
    r.out = i >= 0 ? out.slice(0, i) : out;
    if (mode === 'submit') {
      this.state.tries++;
      if (r.ok && !this.done) this._accepted();
    }
    this.g._saveT = 9.5;
    return r;
  }
  _accepted() {
    const g = this.g;
    this.state.stage = 'done';
    g.audio.pickup?.();
    g.hud.bigToast?.(
      '✅ Accepted！Two Sum',
      '霍華德的忍 400 可以騎了（停在力行宿舍大門前按 F，或用手機呼叫直升機空投）'
    );
    // 霍華德's message (訊息 App): the bike, the helicopter and the race. If the chat is busy (a reply still on its way),
    // it waits until it's free so the message is never dropped
    const lines = [
      'AC 了！O(N)，不錯嘛 😎',
      '忍 400 停在力行宿舍大門前，鑰匙在上面，想騎就騎 🏍️',
      '懶得走過來的話，打開手機的「呼叫載具」，彥霖航空的直升機也可以把忍 400 吊到你旁邊 🚁',
      '新中北路障礙賽也可以騎它去比，報名的時候選車就好 🏁',
      '騎慢一點，摔車我會心疼（車）',
    ];
    let n = 0;
    const send = () => {
      const st = g.phone?.chats.find((c) => c.c.id === 'howard');
      if (!st) return;
      if (st.busy) {
        if (++n < 40) setTimeout(send, 1500);
        return;
      }
      g.phone._deliver(
        st,
        lines.map((text) => ({ who: 'howard', text })),
        0,
        1800 // after the Accepted banner
      );
    };
    send();
  }
}
