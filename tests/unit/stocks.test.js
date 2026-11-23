import { describe, it, expect } from 'vitest';
import {
  roundTick,
  fmtP,
  STOCKS,
  Market,
  isTradingDay,
  OPEN,
  ODD_OPEN,
} from '../../src/systems/StockMarket.js';

function makeMockGame(clock, money = 500000) {
  return {
    clock,
    money,
    _saveT: 0,
    spend(amount) {
      if (this.money < amount) return false;
      this.money -= amount;
      return true;
    },
    earn(amount) {
      this.money += amount;
    },
  };
}

describe('Virtual Stocks System Tests (StockMarket.js)', () => {
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

  describe('STOCKS Listings & trading calendar', () => {
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

    it('should classify weekdays as trading days and weekends as closed', () => {
      expect(isTradingDay(0)).toBe(true); // Monday
      expect(isTradingDay(4)).toBe(true); // Friday
      expect(isTradingDay(5)).toBe(false); // Saturday
      expect(isTradingDay(6)).toBe(false); // Sunday
      expect(isTradingDay(-1)).toBe(false); // previous Sunday
      expect(isTradingDay(-3)).toBe(true); // previous Friday
    });
  });

  describe('Market trading & DCA rules', () => {
    it('should reject invalid orders, closed sessions, and pre-09:10 odd lots', () => {
      const g = makeMockGame(OPEN + 5, 1_000_000); // Monday 09:05 (lot open, odd not yet)
      const market = new Market(g);

      expect(market.order('NOPE', 'buy', 'odd', 10)).toContain('找不到');
      expect(market.order('PYL', 'buy', 'odd', 0)).toContain('數量');
      expect(market.order('PYL', 'buy', 'odd', 10)).toContain('09:10');

      g.clock = ODD_OPEN + 5; // Monday 09:15
      expect(market.order('PYL', 'buy', 'odd', 1000)).toContain('999');

      g.clock = 5 * 1440 + OPEN + 30; // Saturday
      expect(market.order('PYL', 'buy', 'lot', 1)).toContain('休市');
    });

    it('should execute buy and sell orders accurately with fees, tax, and cost basis', () => {
      const g = makeMockGame(ODD_OPEN + 20, 50_000); // Monday 09:30
      const market = new Market(g);
      const price = market.price('PYL');

      // Buy 10 odd shares
      expect(market.order('PYL', 'buy', 'odd', 10)).toBeNull();
      const buyAmount = Math.round(price * 10);
      const buyFee = market.fee(buyAmount, true);
      expect(market.holdings.PYL.sh).toBe(10);
      expect(market.holdings.PYL.cost).toBe(buyAmount + buyFee);
      expect(g.money).toBe(50_000 - (buyAmount + buyFee));
      expect(market.trades.length).toBe(1);

      // Cannot buy more than available balance
      expect(market.order('PYL', 'buy', 'lot', 5)).toContain('錢不夠');
      // Cannot sell more than owned shares
      expect(market.order('PYL', 'sell', 'odd', 11)).toContain('庫存');

      // Partial sell (4 shares) adjusts cost proportionally
      const beforeSellMoney = g.money;
      const beforeSellCost = market.holdings.PYL.cost;
      expect(market.order('PYL', 'sell', 'odd', 4)).toBeNull();
      const sellAmount = Math.round(price * 4);
      const sellNet = sellAmount - market.fee(sellAmount, true) - Math.round(sellAmount * 0.003);
      expect(g.money).toBe(beforeSellMoney + sellNet);
      expect(market.holdings.PYL.sh).toBe(6);
      expect(market.holdings.PYL.cost).toBe(Math.round((beforeSellCost * 6) / 10));

      // Selling remaining 6 shares removes holding entry cleanly
      expect(market.order('PYL', 'sell', 'odd', 6)).toBeNull();
      expect(market.holdings.PYL).toBeUndefined();
    });

    it('should validate DCA minimum amount and register valid plans', () => {
      const g = makeMockGame(ODD_OPEN + 20, 50_000);
      const market = new Market(g);

      expect(market.addDca('NOPE', 1000, 'daily')).toContain('找不到');
      expect(market.addDca('PYL', 50, 'daily')).toContain('NT$100');
      expect(market.addDca('PYL', 200, 'daily')).toContain('買到 1 股');

      expect(market.addDca('PYL', 5000, 'daily')).toBeNull();
      expect(market.dca.length).toBe(1);
      expect(market.dca[0].code).toBe('PYL');
    });
  });
});
