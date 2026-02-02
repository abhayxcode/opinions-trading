import {
  getOrderBook,
  viewOrders,
  buyOrder,
  sellOrder,
  cancelOrder,
} from '../controllers/orders';
import {
  INR_BALANCES,
  STOCK_BALANCES,
  ORDERBOOK,
  resetAllState,
} from '../config/globals';

// Mock the publishOrderbook function
jest.mock('../services/redis', () => ({
  publishOrderbook: jest.fn(),
}));

describe('Orders Controller', () => {
  beforeEach(() => {
    resetAllState();
  });

  describe('getOrderBook', () => {
    it('should return empty object when no orders exist', () => {
      const result = getOrderBook({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({});
    });

    it('should return formatted orderbook', () => {
      ORDERBOOK['BTC_USDT'] = {
        yes: new Map([[5, { total: 10, orders: [] }]]),
        no: new Map([[3, { total: 5, orders: [] }]]),
      };

      const result = getOrderBook({ body: {}, params: {} });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('BTC_USDT');
    });
  });

  describe('viewOrders', () => {
    it('should return 404 for non-existent symbol', () => {
      const result = viewOrders({ body: {}, params: { stockSymbol: 'INVALID' } });
      expect(result.statusCode).toBe(404);
    });

    it('should return orders for existing symbol', () => {
      ORDERBOOK['BTC_USDT'] = {
        yes: new Map(),
        no: new Map(),
      };

      const result = viewOrders({ body: {}, params: { stockSymbol: 'BTC_USDT' } });
      expect(result.statusCode).toBe(200);
    });
  });

  describe('buyOrder', () => {
    beforeEach(() => {
      INR_BALANCES['user1'] = { balance: 100000, locked: 0 }; // 1000 INR
      STOCK_BALANCES['user1'] = {};
      ORDERBOOK['BTC_USDT'] = {
        yes: new Map(),
        no: new Map(),
      };
    });

    it('should return 400 when user does not exist', () => {
      const result = buyOrder({
        body: {
          userId: 'nonexistent',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when symbol does not exist', () => {
      const result = buyOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'INVALID',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for insufficient balance', () => {
      INR_BALANCES['user1'] = { balance: 100, locked: 0 }; // 1 INR

      const result = buyOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('message', 'Insufficient INR balance');
    });

    it('should create pseudo-sell order when no matching orders', () => {
      const result = buyOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('message', 'Bid Submitted');
      // Pseudo-sell is created on opposite type (no) at complementary price (10-5=5)
      expect(ORDERBOOK['BTC_USDT'].no.get(5)).toBeDefined();
      expect(INR_BALANCES['user1'].locked).toBe(5000); // 10 * 5 * 100 paise
    });
  });

  describe('sellOrder', () => {
    beforeEach(() => {
      INR_BALANCES['user1'] = { balance: 100000, locked: 0 };
      STOCK_BALANCES['user1'] = {
        BTC_USDT: {
          yes: { quantity: 100, locked: 0 },
          no: { quantity: 100, locked: 0 },
        },
      };
      ORDERBOOK['BTC_USDT'] = {
        yes: new Map(),
        no: new Map(),
      };
    });

    it('should return 400 when user does not exist', () => {
      const result = sellOrder({
        body: {
          userId: 'nonexistent',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when symbol does not exist', () => {
      const result = sellOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'INVALID',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when user does not own the stock', () => {
      STOCK_BALANCES['user1'] = {};

      const result = sellOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 for insufficient stock balance', () => {
      STOCK_BALANCES['user1']['BTC_USDT'].yes = { quantity: 5, locked: 0 };

      const result = sellOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('message', 'Insufficient stock balance');
    });

    it('should create sell order when no matching buy orders', () => {
      const result = sellOrder({
        body: {
          userId: 'user1',
          stockSymbol: 'BTC_USDT',
          quantity: 10,
          price: 5,
          stockType: 'yes',
        },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(ORDERBOOK['BTC_USDT'].yes.get(5)).toBeDefined();
      expect(STOCK_BALANCES['user1']['BTC_USDT'].yes?.locked).toBe(10);
    });
  });

  describe('cancelOrder', () => {
    beforeEach(() => {
      INR_BALANCES['user1'] = { balance: 50000, locked: 50000 }; // 500 INR balance, 500 locked
      STOCK_BALANCES['user1'] = {
        BTC_USDT: {
          yes: { quantity: 50, locked: 50 },
          no: { quantity: 100, locked: 0 },
        },
      };
      ORDERBOOK['BTC_USDT'] = {
        yes: new Map([
          [
            5,
            {
              total: 50,
              orders: [
                { userId: 'user1', id: 'order1', quantity: 50, type: 'exit' as const },
              ],
            },
          ],
        ]),
        no: new Map([
          [
            5,
            {
              total: 10,
              orders: [
                { userId: 'user1', id: 'order2', quantity: 10, type: 'buy' as const },
              ],
            },
          ],
        ]),
      };
    });

    it('should return 400 when user does not exist', () => {
      const result = cancelOrder({
        body: { userId: 'nonexistent', stockSymbol: 'BTC_USDT', stockType: 'yes' },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when symbol does not exist', () => {
      const result = cancelOrder({
        body: { userId: 'user1', stockSymbol: 'INVALID', stockType: 'yes' },
        params: {},
      });
      expect(result.statusCode).toBe(400);
    });

    it('should return 404 when no orders to cancel', () => {
      ORDERBOOK['BTC_USDT'] = { yes: new Map(), no: new Map() };

      const result = cancelOrder({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', stockType: 'yes' },
        params: {},
      });
      expect(result.statusCode).toBe(404);
    });

    it('should cancel exit orders and refund stock', () => {
      const result = cancelOrder({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', stockType: 'yes' },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('refundedStock', 50);
      expect(STOCK_BALANCES['user1']['BTC_USDT'].yes?.quantity).toBe(100);
      expect(STOCK_BALANCES['user1']['BTC_USDT'].yes?.locked).toBe(0);
    });

    it('should cancel buy orders (pseudo-sells) and refund INR', () => {
      // The buy order for 'yes' is stored as pseudo-sell on 'no' at price 5
      // Original buy price = 10 - 5 = 5
      const result = cancelOrder({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', stockType: 'yes' },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      // 10 quantity * 5 price = 50 INR refunded
      expect(result.data).toHaveProperty('refundedInr', 50);
    });

    it('should clean up empty price levels after cancellation', () => {
      cancelOrder({
        body: { userId: 'user1', stockSymbol: 'BTC_USDT', stockType: 'yes' },
        params: {},
      });
      expect(ORDERBOOK['BTC_USDT'].yes.size).toBe(0);
      expect(ORDERBOOK['BTC_USDT'].no.size).toBe(0);
    });
  });
});
