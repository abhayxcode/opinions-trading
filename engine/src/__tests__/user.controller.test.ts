import { registerUser, loginUser } from '../controllers/user.controller';
import { INR_BALANCES, STOCK_BALANCES, USERS, resetAllState } from '../config/globals';

describe('User Controller', () => {
  beforeEach(() => {
    resetAllState();
  });

  describe('registerUser', () => {
    it('should return 400 when userId is missing', async () => {
      const result = await registerUser({ body: { password: 'password123' }, params: {} });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return 400 when password is missing', async () => {
      const result = await registerUser({ body: { userId: 'testuser' }, params: {} });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should register a new user successfully', async () => {
      const result = await registerUser({
        body: { userId: 'testuser', password: 'password123' },
        params: {},
      });
      expect(result.statusCode).toBe(201);
      expect(result.data).toHaveProperty('userId', 'testuser');
      expect(result.data).toHaveProperty('role', 'user');
      expect(USERS['testuser']).toBeDefined();
      expect(USERS['testuser'].passwordHash).toBeDefined();
      expect(USERS['testuser'].role).toBe('user');
      expect(INR_BALANCES['testuser']).toEqual({ balance: 0, locked: 0 });
      expect(STOCK_BALANCES['testuser']).toEqual({});
    });

    it('should return 409 when user already exists', async () => {
      USERS['testuser'] = {
        passwordHash: 'somehash',
        role: 'user',
        createdAt: Date.now(),
      };

      const result = await registerUser({
        body: { userId: 'testuser', password: 'password123' },
        params: {},
      });
      expect(result.statusCode).toBe(409);
      expect(result.data).toHaveProperty('error', 'User already exists');
    });

    it('should hash the password correctly', async () => {
      await registerUser({
        body: { userId: 'testuser', password: 'password123' },
        params: {},
      });

      // Password hash should not be the plain password
      expect(USERS['testuser'].passwordHash).not.toBe('password123');
      // Should be a bcrypt hash (starts with $2)
      expect(USERS['testuser'].passwordHash).toMatch(/^\$2[aby]?\$/);
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await registerUser({
        body: { userId: 'testuser', password: 'password123' },
        params: {},
      });
    });

    it('should return 400 when userId is missing', async () => {
      const result = await loginUser({ body: { password: 'password123' }, params: {} });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return 400 when password is missing', async () => {
      const result = await loginUser({ body: { userId: 'testuser' }, params: {} });
      expect(result.statusCode).toBe(400);
      expect(result.data).toHaveProperty('error');
    });

    it('should return 401 for non-existent user', async () => {
      const result = await loginUser({
        body: { userId: 'nonexistent', password: 'password123' },
        params: {},
      });
      expect(result.statusCode).toBe(401);
      expect(result.data).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      const result = await loginUser({
        body: { userId: 'testuser', password: 'wrongpassword' },
        params: {},
      });
      expect(result.statusCode).toBe(401);
      expect(result.data).toHaveProperty('error', 'Invalid credentials');
    });

    it('should login successfully with correct credentials', async () => {
      const result = await loginUser({
        body: { userId: 'testuser', password: 'password123' },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('message', 'Login successful');
      expect(result.data).toHaveProperty('userId', 'testuser');
      expect(result.data).toHaveProperty('role', 'user');
    });

    it('should allow admin login with default password', async () => {
      const result = await loginUser({
        body: { userId: 'admin', password: 'admin-default-password' },
        params: {},
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveProperty('userId', 'admin');
      expect(result.data).toHaveProperty('role', 'admin');
    });

    it('should reject admin login with wrong password', async () => {
      const result = await loginUser({
        body: { userId: 'admin', password: 'wrongpassword' },
        params: {},
      });
      expect(result.statusCode).toBe(401);
    });
  });
});
