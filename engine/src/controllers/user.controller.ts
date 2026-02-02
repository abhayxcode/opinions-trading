import { INR_BALANCES, STOCK_BALANCES, USERS } from "../config/globals";
import { QUEUE_REQUEST } from "../interfaces/requestModels";
import { hashPassword, comparePassword } from "../utils/password.utils";

const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'admin-default-password';

/**
 * Register a new user
 * @param req - The request object
 * @returns The response object with user info (password hashing happens here)
 */
export const registerUser = async (req: QUEUE_REQUEST) => {
  const { userId, password } = req.body as { userId: string; password: string };

  if (!userId || !password) {
    return { statusCode: 400, data: { error: "userId and password are required" } };
  }

  if (USERS[userId]) {
    return { statusCode: 409, data: { error: "User already exists" } };
  }

  const passwordHash = await hashPassword(password);

  // Create user in USERS store
  USERS[userId] = {
    passwordHash,
    role: 'user',
    createdAt: Date.now(),
  };

  // Initialize balances
  INR_BALANCES[userId] = { balance: 0, locked: 0 };
  STOCK_BALANCES[userId] = {};

  return {
    statusCode: 201,
    data: {
      message: `User ${userId} registered successfully`,
      userId,
      role: 'user',
    },
  };
};

/**
 * Login user
 * @param req - The request object
 * @returns The response object with user info for JWT generation
 */
export const loginUser = async (req: QUEUE_REQUEST) => {
  const { userId, password } = req.body as { userId: string; password: string };

  if (!userId || !password) {
    return { statusCode: 400, data: { error: "userId and password are required" } };
  }

  // Check for admin login
  if (userId === 'admin') {
    if (password === ADMIN_DEFAULT_PASSWORD) {
      return {
        statusCode: 200,
        data: {
          message: "Login successful",
          userId: 'admin',
          role: 'admin',
        },
      };
    }
    return { statusCode: 401, data: { error: "Invalid credentials" } };
  }

  const user = USERS[userId];

  if (!user) {
    return { statusCode: 401, data: { error: "Invalid credentials" } };
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return { statusCode: 401, data: { error: "Invalid credentials" } };
  }

  return {
    statusCode: 200,
    data: {
      message: "Login successful",
      userId,
      role: user.role,
    },
  };
};
