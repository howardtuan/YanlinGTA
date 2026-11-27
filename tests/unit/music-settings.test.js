// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings } from '../../src/systems/AudioSystem.js';

const KEY = 'cycu-shun-settings-v2';

describe('背景音樂設定', () => {
  beforeEach(() => localStorage.removeItem(KEY));

  it('新玩家預設是情境配樂', () => {
    expect(loadSettings().music).toBe('scene');
  });

  it('舊存檔選了已移除的「預設音樂」會改成情境配樂，其他選擇照舊', () => {
    localStorage.setItem(KEY, JSON.stringify({ music: 'default', musicVol: 0.3 }));
    expect(loadSettings()).toMatchObject({ music: 'scene', musicVol: 0.3 });
    localStorage.setItem(KEY, JSON.stringify({ music: 'opera' }));
    expect(loadSettings().music).toBe('opera');
    localStorage.setItem(KEY, JSON.stringify({ music: 'off' }));
    expect(loadSettings().music).toBe('off');
  });
});
