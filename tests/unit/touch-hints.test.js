import { describe, it, expect } from 'vitest';
import { touchHints, TOUCH_KEYS } from '../../src/core/KeyHints.js';

// 手機觸控（body.touch）時，提示裡的鍵盤說法要換成畫面上的觸控按鈕（src/core/KeyHints.js）
describe('touchHints：手機上不出現「按 M」「按 J」這種鍵盤說法', () => {
  const t = (s, html = true) => touchHints(s, html, true);

  it('桌機（非觸控）原樣不動', () => {
    const s = '按 <kbd>M</kbd> 打開大地圖';
    expect(touchHints(s, true, false)).toBe(s);
  });

  it('HTML 提示：<kbd> 鍵換成觸控鈕', () => {
    expect(t('按 <kbd>M</kbd> 打開大地圖')).toBe('點 <kbd>🗺 地圖</kbd> 打開大地圖');
    expect(t('按 <kbd>E</kbd> 在 276 寢門口拉票')).toBe('點 <kbd>E</kbd> 在 276 寢門口拉票');
    expect(t('對同學按 <kbd>滑鼠左鍵</kbd> 發傳單拉票！')).toBe(
      '對同學點 <kbd>📄</kbd> 發傳單拉票！'
    );
    expect(t('走到同學旁邊按 <kbd>滑鼠左鍵</kbd>（手機按 📄）遞傳單')).toBe(
      '走到同學旁邊點 <kbd>📄</kbd> 遞傳單'
    );
  });

  it('整句改寫：對話繼續、關掉電腦', () => {
    expect(t('先把話說完（按 <kbd>E</kbd> 或 <kbd>Enter</kbd> 繼續）。')).toBe(
      '先把話說完（點一下畫面繼續）。'
    );
    expect(t('已經破案了！按 <kbd>Esc</kbd> 關掉電腦')).toBe(
      '已經破案了！點右下角 <kbd>⏻</kbd> 離開電腦'
    );
  });

  it('純文字（對話框、toast）：「按 M」「按 J」也換掉，不留 <kbd>', () => {
    expect(t('不知道怎麼走就按 M 看大地圖', false)).toBe('不知道怎麼走就點「🗺 地圖」 看大地圖');
    expect(t('按 J 打開提示', false)).toBe('點「S.U.N.D.A.Y」 打開提示');
    expect(t('按 [[M|View]]', false)).toBe('按 [[M|View]]'); // [[…]] 由 HUD 先換成鍵名
  });

  it('沒有觸控對應的鍵、或只是剛好有英文字母的句子不動', () => {
    expect(t('打 LOL 只能單手按 Q 😭', false)).toBe('打 LOL 只能單手按 Q 😭');
    expect(t('按 Enter 送出', false)).toBe('按 Enter 送出');
    expect(t('按 Esc', false)).toBe('點「⚙」');
    expect(Object.values(TOUCH_KEYS).every((v) => v && !/^[A-Z][a-z]/.test(v))).toBe(true);
  });
});
