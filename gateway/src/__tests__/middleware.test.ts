import { Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin, requireSelfOrAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { generateToken } from '../utils/jwt.utils';
import { z } from 'zod';

// Mock request, response, and next function
const mockRequest = (options: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  body: {},
  params: {},
  ...options,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 when no authorization header', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authorization token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      const req = mockRequest({
        headers: { authorization: 'Basic token123' },
      }) as Request;
      const res = mockResponse() as Response;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalidtoken' },
      }) as Request;
      const res = mockResponse() as Response;

      authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should set auth context for valid token', () => {
      const token = generateToken({ userId: 'testuser', role: 'user' });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = mockResponse() as Response;

      authenticate(req, res, mockNext);

      expect(req.auth).toEqual({
        userId: 'testuser',
        role: 'user',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set admin auth context for admin token', () => {
      const token = generateToken({ userId: 'admin', role: 'admin' });
      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = mockResponse() as Response;

      authenticate(req, res, mockNext);

      expect(req.auth).toEqual({
        userId: 'admin',
        role: 'admin',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 401 when no auth context', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      requireAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      const req = mockRequest() as Request;
      req.auth = { userId: 'testuser', role: 'user' };
      const res = mockResponse() as Response;

      requireAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when user is admin', () => {
      const req = mockRequest() as Request;
      req.auth = { userId: 'admin', role: 'admin' };
      const res = mockResponse() as Response;

      requireAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireSelfOrAdmin', () => {
    it('should return 401 when no auth context', () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      requireSelfOrAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow access when user accesses own resource via params', () => {
      const req = mockRequest({
        params: { userId: 'testuser' },
      }) as Request;
      req.auth = { userId: 'testuser', role: 'user' };
      const res = mockResponse() as Response;

      requireSelfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow access when user accesses own resource via body', () => {
      const req = mockRequest({
        body: { userId: 'testuser' },
      }) as Request;
      req.auth = { userId: 'testuser', role: 'user' };
      const res = mockResponse() as Response;

      requireSelfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user accesses other user resource', () => {
      const req = mockRequest({
        params: { userId: 'otheruser' },
      }) as Request;
      req.auth = { userId: 'testuser', role: 'user' };
      const res = mockResponse() as Response;

      requireSelfOrAdmin(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin to access any resource', () => {
      const req = mockRequest({
        params: { userId: 'otheruser' },
      }) as Request;
      req.auth = { userId: 'admin', role: 'admin' };
      const res = mockResponse() as Response;

      requireSelfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('Validation Middleware', () => {
  const testSchema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next for valid input', () => {
    const req = mockRequest({
      body: { name: 'John', age: 25 },
    }) as Request;
    const res = mockResponse() as Response;

    validate(testSchema)(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid input', () => {
    const req = mockRequest({
      body: { name: '', age: -5 },
    }) as Request;
    const res = mockResponse() as Response;

    validate(testSchema)(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        details: expect.any(Array),
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should include field paths in error details', () => {
    const req = mockRequest({
      body: { name: '', age: 25 },
    }) as Request;
    const res = mockResponse() as Response;

    validate(testSchema)(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
          }),
        ]),
      })
    );
  });

  it('should handle missing fields', () => {
    const req = mockRequest({
      body: {},
    }) as Request;
    const res = mockResponse() as Response;

    validate(testSchema)(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
