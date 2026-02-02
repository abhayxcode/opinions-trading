import { createUser, createSymbol, mintToken, reset } from '../controllers/auth';
import {
  INR_BALANCES,
  STOCK_BALANCES,
  ORDERBOOK,
  USERS,
  resetAllState,
} from '../config/globals';

describe('Auth Controller', () => {
  beforeEach(() => {
    resetAllState();
  });

  describe('createUser', () => {
    it('should return 404 when userId is not provided', () => {
      const result = createUser({ body: {}, params: {} });
      expect(result.statusCode).toBe(404);
      expect(result.data).toHaveProperty('error');
    });

    it('should create a new user successfully', () => {
      const result = createUser({ body: {}, params: { userId: 'testuser' } });
      expect(result.statusCode).toBe(201);
      expect(INR_BALANCES['testuser']).toEqual({ balance: 0, locked: 0 });
      expect(STOCK_BALANCES['testuser']).toEqual({});
    });

    it('should return 409 when user already exists', () => {
      INR_BALANCES['testuser'] = { balance: 0, locked: 0 };

      const result = createUser({ body: {}, params: { userId: 'testuser' } });
      expect(result.statusCode).toBe(409);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('createSymbol', () => {
    it('should return 404 when stockSymbol is not provided', () => {
      const result = createSymbol({ body: {}, params: {} });
      expect(result.statusCode).toBe(404);
      expect(result.data).toHaveProperty('error');
    });

    it('should create a new symbol successfully', () => {
      const result = createSymbol({ body: {}, params: { stockSymbol: 'BTC_USDT' } });
      expect(result.statusCode).toBe(201);
      expect(ORDERBOOK['BTC_USDT']).toBeDefined();
      expect(ORDERBOOK['BTC_USDT'].yes).toBeInstanceOf(Map);
      expect(ORDERBOOK['BTC_USDT'].no).toBeInstanceOf(Map);
    });

    it('should return 409 when symbol already exists', () => {
      ORDERBOOK['BTC_USDT'] = { yes: new Map(), no: new Map() };

      const result = createSymbol({ body: {}, params: { stockSymbol: 'BTC_USDT' } });
      expect(result.statusCode).toBe(409);
      expect(result.data).toHaveProperty('error');
    });
  });

  describe('mintToken', () => {
    beforeEach(() => {
      INR_BALANCES['user1'] = { balance: 100000, locked: 0 }; // 1000 INR
      STOCK_BALANCES['user1'] = {};
      ORDERBOOK['BTC_USDT'] = { yes: new Map(), no: new Map() };
    });

    it('should return 400 when required fields are missing', () => {
      const result = mintToken({ body: {}, params: {} });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return 404 when user does not exist', () => {
      const result = mintToken({
        body: { userId: 'nonexistent', stockSymbol: 'BTC_USDT', quantity: 10 },
        params: {},
      });
      expect(result.statusCode).toBe(404);
    });

    it('should return 404 when symbol does not exist', () => {
      const result = mintToken({
        body: { userId: 'user1', stockSymbol: 'INVALID', quantity: 10 },
        params: {},
      });
      expect(result.statusCode).toBe(404);
    });

    it('should return message for insufficient balance', () => {
      INR_BALANCES['user1'] = { balance: 100, locked: 0 }; // 1 INR

      const result = mintToken({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', quantity: 10, price: 10 },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('message', 'Insufficient INR Balance');
    });

    it('should mint tokens successfully', () => {
      const result = mintToken({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', quantity: 5, price: 10 },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(STOCK_BALANCES['user1']['BTC_USDT']).toEqual({
        yes: { quantity: 5, locked: 0 },
        no: { quantity: 5, locked: 0 },
      });
      expect(INR_BALANCES['user1'].balance).toBe(95000); // 1000 - 50 = 950 INR
    });

    it('should add to existing stock balances', () => {
      STOCK_BALANCES['user1']['BTC_USDT'] = {
        yes: { quantity: 5, locked: 0 },
        no: { quantity: 5, locked: 0 },
      };

      const result = mintToken({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', quantity: 3, price: 10 },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(STOCK_BALANCES['user1']['BTC_USDT'].yes?.quantity).toBe(8);
      expect(STOCK_BALANCES['user1']['BTC_USDT'].no?.quantity).toBe(8);
    });
  });

  describe('reset', () => {
    it('should clear all in-memory state', () => {
      INR_BALANCES['user1'] = { balance: 1000, locked: 0 };
      STOCK_BALANCES['user1'] = { BTC: { yes: { quantity: 10, locked: 0 } } };
      ORDERBOOK['BTC_USDT'] = { yes: new Map(), no: new Map() };
      USERS['user1'] = { passwordHash: 'hash', role: 'user', createdAt: Date.now() };

      const result = reset({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(Object.keys(INR_BALANCES)).toHaveLength(0);
      expect(Object.keys(STOCK_BALANCES)).toHaveLength(0);
      expect(Object.keys(ORDERBOOK)).toHaveLength(0);
      expect(Object.keys(USERS)).toHaveLength(0);
    });
  });
});
