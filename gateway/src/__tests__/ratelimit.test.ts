import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../middleware/ratelimit.middleware';

// Mock the Redis client
const mockMulti = {
  zRemRangeByScore: jest.fn().mockReturnThis(),
  zCard: jest.fn().mockReturnThis(),
  zAdd: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

jest.mock('../services/redis', () => ({
  client: {
    multi: () => mockMulti,
  },
}));

// Mock request helper
const mockRequest = (options: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  body: {},
  params: {},
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' } as any,
  ...options,
});

// Mock response helper
const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('Rate Limiter Middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext = jest.fn();
  });

  describe('createRateLimiter', () => {
    it('should allow requests within rate limit', async () => {
      mockMulti.exec.mockResolvedValue([null, 5, null, null]); // 5 requests so far

      const rateLimiter = createRateLimiter({ maxRequests: 10 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should block requests exceeding rate limit', async () => {
      mockMulti.exec.mockResolvedValue([null, 10, null, null]); // 10 requests (at limit)

      const rateLimiter = createRateLimiter({ maxRequests: 10 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          retryAfter: expect.any(Number),
        })
      );
    });

    it('should use custom error message', async () => {
      mockMulti.exec.mockResolvedValue([null, 10, null, null]);

      const customMessage = 'Custom rate limit message';
      const rateLimiter = createRateLimiter({ maxRequests: 10, message: customMessage });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: customMessage,
        })
      );
    });

    it('should set Retry-After header when rate limited', async () => {
      mockMulti.exec.mockResolvedValue([null, 10, null, null]);

      const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });

    it('should use userId for authenticated requests', async () => {
      mockMulti.exec.mockResolvedValue([null, 1, null, null]);

      const rateLimiter = createRateLimiter({ keyPrefix: 'test' });
      const req = mockRequest() as Request;
      req.auth = { userId: 'testuser', role: 'user' };
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockMulti.zRemRangeByScore).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use IP address for unauthenticated requests', async () => {
      mockMulti.exec.mockResolvedValue([null, 1, null, null]);

      const rateLimiter = createRateLimiter({ keyPrefix: 'test' });
      const req = mockRequest({ ip: '192.168.1.1' }) as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockMulti.zRemRangeByScore).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle x-forwarded-for header for proxied requests', async () => {
      mockMulti.exec.mockResolvedValue([null, 1, null, null]);

      const rateLimiter = createRateLimiter({ keyPrefix: 'test' });
      const req = mockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      }) as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow request if Redis fails (fail-open)', async () => {
      mockMulti.exec.mockRejectedValue(new Error('Redis connection failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const rateLimiter = createRateLimiter({ maxRequests: 10 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Rate limiter error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should set X-RateLimit-Reset header', async () => {
      mockMulti.exec.mockResolvedValue([null, 5, null, null]);

      const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should show 0 remaining when at limit', async () => {
      mockMulti.exec.mockResolvedValue([null, 9, null, null]); // 9 requests, limit is 10

      const rateLimiter = createRateLimiter({ maxRequests: 10 });
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;

      await rateLimiter(req, res, mockNext);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
