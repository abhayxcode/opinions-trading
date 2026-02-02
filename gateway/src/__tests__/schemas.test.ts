import {
  userIdSchema,
  stockSymbolSchema,
  stockTypeSchema,
  priceSchema,
  quantitySchema,
  amountSchema,
} from '../schemas/common.schema';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { buyOrderSchema, sellOrderSchema } from '../schemas/order.schema';

describe('Common Schemas', () => {
  describe('userIdSchema', () => {
    it('should accept valid user ID', () => {
      expect(() => userIdSchema.parse('testuser')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => userIdSchema.parse('')).toThrow();
    });
  });

  describe('stockSymbolSchema', () => {
    it('should accept valid stock symbol', () => {
      expect(() => stockSymbolSchema.parse('BTC_USDT')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => stockSymbolSchema.parse('')).toThrow();
    });
  });

  describe('stockTypeSchema', () => {
    it('should accept "yes"', () => {
      expect(stockTypeSchema.parse('yes')).toBe('yes');
    });

    it('should accept "no"', () => {
      expect(stockTypeSchema.parse('no')).toBe('no');
    });

    it('should reject other values', () => {
      expect(() => stockTypeSchema.parse('maybe')).toThrow();
    });
  });

  describe('priceSchema', () => {
    it('should accept valid prices (0.5 increments)', () => {
      const validPrices = [0.5, 1, 1.5, 2, 5, 7.5, 10];
      validPrices.forEach((price) => {
        expect(() => priceSchema.parse(price)).not.toThrow();
      });
    });

    it('should reject prices below 0.5', () => {
      expect(() => priceSchema.parse(0.4)).toThrow();
      expect(() => priceSchema.parse(0)).toThrow();
    });

    it('should reject prices above 10', () => {
      expect(() => priceSchema.parse(10.5)).toThrow();
      expect(() => priceSchema.parse(11)).toThrow();
    });

    it('should reject prices not in 0.5 increments', () => {
      expect(() => priceSchema.parse(1.3)).toThrow();
      expect(() => priceSchema.parse(2.7)).toThrow();
      expect(() => priceSchema.parse(5.25)).toThrow();
    });
  });

  describe('quantitySchema', () => {
    it('should accept positive integers', () => {
      expect(() => quantitySchema.parse(1)).not.toThrow();
      expect(() => quantitySchema.parse(100)).not.toThrow();
    });

    it('should reject zero', () => {
      expect(() => quantitySchema.parse(0)).toThrow();
    });

    it('should reject negative numbers', () => {
      expect(() => quantitySchema.parse(-1)).toThrow();
    });

    it('should reject non-integers', () => {
      expect(() => quantitySchema.parse(1.5)).toThrow();
    });
  });

  describe('amountSchema', () => {
    it('should accept positive numbers', () => {
      expect(() => amountSchema.parse(100)).not.toThrow();
      expect(() => amountSchema.parse(0.01)).not.toThrow();
    });

    it('should reject zero', () => {
      expect(() => amountSchema.parse(0)).toThrow();
    });

    it('should reject negative numbers', () => {
      expect(() => amountSchema.parse(-100)).toThrow();
    });
  });
});

describe('Auth Schemas', () => {
  describe('registerSchema', () => {
    it('should accept valid registration data', () => {
      const validData = { userId: 'testuser', password: 'password123' };
      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should accept userId with underscores and hyphens', () => {
      expect(() =>
        registerSchema.parse({ userId: 'test_user-123', password: 'password123' })
      ).not.toThrow();
    });

    it('should reject userId less than 3 characters', () => {
      expect(() =>
        registerSchema.parse({ userId: 'ab', password: 'password123' })
      ).toThrow();
    });

    it('should reject userId more than 50 characters', () => {
      expect(() =>
        registerSchema.parse({
          userId: 'a'.repeat(51),
          password: 'password123',
        })
      ).toThrow();
    });

    it('should reject userId with special characters', () => {
      expect(() =>
        registerSchema.parse({ userId: 'test@user', password: 'password123' })
      ).toThrow();
      expect(() =>
        registerSchema.parse({ userId: 'test user', password: 'password123' })
      ).toThrow();
    });

    it('should reject password less than 8 characters', () => {
      expect(() =>
        registerSchema.parse({ userId: 'testuser', password: 'pass' })
      ).toThrow();
    });

    it('should reject password more than 100 characters', () => {
      expect(() =>
        registerSchema.parse({ userId: 'testuser', password: 'a'.repeat(101) })
      ).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validData = { userId: 'testuser', password: 'password123' };
      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty userId', () => {
      expect(() =>
        loginSchema.parse({ userId: '', password: 'password123' })
      ).toThrow();
    });

    it('should reject empty password', () => {
      expect(() =>
        loginSchema.parse({ userId: 'testuser', password: '' })
      ).toThrow();
    });
  });
});

describe('Order Schemas', () => {
  describe('buyOrderSchema', () => {
    const validOrder = {
      userId: 'testuser',
      stockSymbol: 'BTC_USDT',
      quantity: 10,
      price: 5,
      stockType: 'yes' as const,
    };

    it('should accept valid buy order', () => {
      expect(() => buyOrderSchema.parse(validOrder)).not.toThrow();
    });

    it('should reject missing userId', () => {
      const { userId, ...order } = validOrder;
      expect(() => buyOrderSchema.parse(order)).toThrow();
    });

    it('should reject missing stockSymbol', () => {
      const { stockSymbol, ...order } = validOrder;
      expect(() => buyOrderSchema.parse(order)).toThrow();
    });

    it('should reject invalid quantity', () => {
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, quantity: 0 })
      ).toThrow();
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, quantity: -5 })
      ).toThrow();
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, quantity: 1.5 })
      ).toThrow();
    });

    it('should reject invalid price', () => {
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, price: 0 })
      ).toThrow();
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, price: 11 })
      ).toThrow();
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, price: 1.3 })
      ).toThrow();
    });

    it('should reject invalid stockType', () => {
      expect(() =>
        buyOrderSchema.parse({ ...validOrder, stockType: 'maybe' })
      ).toThrow();
    });
  });

  describe('sellOrderSchema', () => {
    const validOrder = {
      userId: 'testuser',
      stockSymbol: 'BTC_USDT',
      quantity: 10,
      price: 5,
      stockType: 'no' as const,
    };

    it('should accept valid sell order', () => {
      expect(() => sellOrderSchema.parse(validOrder)).not.toThrow();
    });

    it('should validate all fields like buyOrderSchema', () => {
      expect(() =>
        sellOrderSchema.parse({ ...validOrder, quantity: -1 })
      ).toThrow();
      expect(() =>
        sellOrderSchema.parse({ ...validOrder, price: 15 })
      ).toThrow();
    });
  });
});
