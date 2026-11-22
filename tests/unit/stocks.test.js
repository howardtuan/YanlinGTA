import { describe, it, expect } from 'vitest';
import { roundTick, fmtP, STOCKS } from '../../src/systems/StockMarket.js';

describe('Virtual Stocks System Tests (stocks.js)', () => {
  describe('roundTick price stepping rules', () => {
    it('should round to 0.01 for prices under 10', () => {
      expect(roundTick(5.123)).toBe(5.12);
      expect(roundTick(5.127)).toBe(5.13);
    });

    it('should round to 0.05 for prices between 10 and 50', () => {
      expect(roundTick(24.52)).toBe(24.5);
      expect(roundTick(24.54)).toBe(24.55);
      expect(roundTick(48.98)).toBe(49.0);
    });

    it('should round to 0.1 for prices between 50 and 100', () => {
      expect(roundTick(85.34)).toBe(85.3);
      expect(roundTick(85.36)).toBe(85.4);
    });

    it('should round to 0.5 for prices between 100 and 500', () => {
      expect(roundTick(150.2)).toBe(150.0);
      expect(roundTick(150.4)).toBe(150.5);
    });

    it('should round to 1 for prices between 500 and 1000', () => {
      expect(roundTick(650.4)).toBe(650.0);
      expect(roundTick(650.6)).toBe(651.0);
    });

    it('should round to 5 for prices >= 1000', () => {
      expect(roundTick(1052)).toBe(1050);
      expect(roundTick(1053)).toBe(1055);
    });
  });

  describe('fmtP price formatting', () => {
    it('should format numbers with appropriate decimal digits', () => {
      expect(fmtP(8.5)).toBe('8.50');
      expect(fmtP(32.5)).toBe('32.50');
      expect(fmtP(250.34)).toBe('250.3');
      expect(fmtP(1050.2)).toBe('1050');
    });
  });

  describe('STOCKS Listings', () => {
    it('should contain 100 listings starting with PYL', () => {
      expect(STOCKS.length).toBe(100);
      expect(STOCKS[0].code).toBe('PYL');
      expect(STOCKS[0].name).toBe('彥霖好帥');
      expect(STOCKS[0].base).toBe(888);
    });

    it('should have valid codes and company names for all listings', () => {
      for (const stock of STOCKS) {
        expect(stock.code).toBeTruthy();
        expect(stock.name).toBeTruthy();
        expect(stock.base).toBeGreaterThan(0);
      }
    });
  });
});
