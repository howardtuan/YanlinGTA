import { describe, it, expect } from 'vitest';
import { serviceState, serviceName } from '../../src/entities/npcs/Service.js';

// noon local time on a date, so time zones never move it across midnight
const at = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

describe('義務役 calendar (src/entities/npcs/Service.js)', () => {
  it('肉舖老闆: serves from 2026/11/6, discharged on 2027/3/6', () => {
    expect(serviceState('gd', at('2026-11-05'))).toBe(null);
    expect(serviceState('gd', at('2026-11-06'))).toBe('duty'); // a Friday
    expect(serviceState('gd', at('2026-11-07'))).toBe('leave'); // Saturday
    expect(serviceState('gd', at('2027-03-05'))).toBe('duty'); // the last day, a Friday
    expect(serviceState('gd', at('2027-03-06'))).toBe(null); // 退伍日
  });
  it('11/30 group: serves from 2026/11/30, discharged on 2027/3/30', () => {
    for (const id of ['garry', 'howard']) {
      expect(serviceState(id, at('2026-11-29'))).toBe(null);
      expect(serviceState(id, at('2026-11-30'))).toBe('duty'); // a Monday
      expect(serviceState(id, at('2027-03-29'))).toBe('duty'); // the last day, a Monday
      expect(serviceState(id, at('2027-03-30'))).toBe(null); // 退伍日
    }
  });
  it('12/18 group: serves from 2026/12/18, discharged on 2027/4/18', () => {
    for (const id of ['zz', 'houshe', 'richard']) {
      expect(serviceState(id, at('2026-12-17'))).toBe(null);
      expect(serviceState(id, at('2026-12-18'))).toBe('duty'); // a Friday
      expect(serviceState(id, at('2027-04-17'))).toBe('leave'); // the last day, a Saturday
      expect(serviceState(id, at('2027-04-18'))).toBe(null); // 退伍日
    }
  });
  it('weekends in the service are leave (own clothes), weekdays duty (uniform)', () => {
    expect(serviceState('garry', at('2026-12-19'))).toBe('leave'); // Saturday
    expect(serviceState('garry', at('2026-12-20'))).toBe('leave'); // Sunday
    expect(serviceState('garry', at('2026-12-21'))).toBe('duty'); // Monday
  });
  it('people who are not serving never change', () => {
    expect(serviceState('jianyu', at('2027-01-04'))).toBe(null);
    expect(serviceName('jianyu', '劍玉')).toBe('劍玉');
  });
});
