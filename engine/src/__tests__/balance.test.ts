import {
  getInrBalances,
  getInrBalanceByUserId,
  getStockBalances,
  getStockBalancebyUserId,
  onRamp,
} from '../controllers/balance';
import { INR_BALANCES, STOCK_BALANCES, resetAllState } from '../config/globals';

describe('Balance Controller', () => {
  beforeEach(() => {
    resetAllState();
  });

  describe('getInrBalances', () => {
    it('should return empty object when no users exist', () => {
      const result = getInrBalances({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({});
    });

    it('should return all INR balances', () => {
      INR_BALANCES['user1'] = { balance: 1000, locked: 0 };
      INR_BALANCES['user2'] = { balance: 2000, locked: 500 };

      const result = getInrBalances({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({
        user1: { balance: 1000, locked: 0 },
        user2: { balance: 2000, locked: 500 },
      });
    });
  });

  describe('getInrBalanceByUserId', () => {
    it('should return 400 for non-existent user', () => {
      const result = getInrBalanceByUserId({
        body: {},
        params: { userId: 'nonexistent' },
      });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return balance for existing user', () => {
      INR_BALANCES['user1'] = { balance: 5000, locked: 100 };

      const result = getInrBalanceByUserId({
        body: {},
        params: { userId: 'user1' },
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toBe(5000);
    });
  });

  describe('getStockBalances', () => {
    it('should return empty object when no stock balances exist', () => {
      const result = getStockBalances({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({});
    });

    it('should return all stock balances', () => {
      STOCK_BALANCES['user1'] = {
        BTC_USDT: {
          yes: { quantity: 10, locked: 0 },
          no: { quantity: 5, locked: 0 },
        },
      };

      const result = getStockBalances({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({
        user1: {
          BTC_USDT: {
            yes: { quantity: 10, locked: 0 },
            no: { quantity: 5, locked: 0 },
          },
        },
      });
    });
  });

  describe('getStockBalancebyUserId', () => {
    it('should return 400 for non-existent user', () => {
      const result = getStockBalancebyUserId({
        body: {},
        params: { userId: 'nonexistent' },
      });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return message when user has no stocks', () => {
      INR_BALANCES['user1'] = { balance: 1000, locked: 0 };

      const result = getStockBalancebyUserId({
        body: {},
        params: { userId: 'user1' },
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('message');
    });

    it('should return stock balances for user', () => {
      INR_BALANCES['user1'] = { balance: 1000, locked: 0 };
      STOCK_BALANCES['user1'] = {
        BTC_USDT: {
          yes: { quantity: 10, locked: 0 },
        },
      };

      const result = getStockBalancebyUserId({
        body: {},
        params: { userId: 'user1' },
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({
        BTC_USDT: {
          yes: { quantity: 10, locked: 0 },
        },
      });
    });
  });

  describe('onRamp', () => {
    it('should return 400 for non-existent user', () => {
      const result = onRamp({
        body: { userId: 'nonexistent', amount: 1000 },
        params: {},
      });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should add amount to user balance', () => {
      INR_BALANCES['user1'] = { balance: 1000, locked: 0 };

      const result = onRamp({
        body: { userId: 'user1', amount: 5000 },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(INR_BALANCES['user1'].balance).toBe(6000);
    });

    it('should handle multiple onramp operations', () => {
      INR_BALANCES['user1'] = { balance: 0, locked: 0 };

      onRamp({ body: { userId: 'user1', amount: 1000 }, params: {} });
      onRamp({ body: { userId: 'user1', amount: 2000 }, params: {} });

      expect(INR_BALANCES['user1'].balance).toBe(3000);
    });
  });
});
