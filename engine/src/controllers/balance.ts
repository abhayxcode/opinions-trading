import { INR_BALANCES, STOCK_BALANCES } from "../config/globals";
import { QUEUE_REQUEST } from "../interfaces/requestModels";

/**
 * Get INR Balance
 * @param req - The request object
 * @returns The response object
 */
export const getInrBalances = (req: QUEUE_REQUEST) => {
  return { statusCode: 200, data: INR_BALANCES };
};

/**
 * Get INR Balance by User Id
 * @param req - The request object
 * @returns The response object
 */
export const getInrBalanceByUserId = (req: QUEUE_REQUEST) => {
  const userId = req.params.userId as string;

  const userExists = INR_BALANCES[userId];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with ID ${userId} does not exist` },
    };
  }

  const balance = INR_BALANCES[userId].balance;
  return { statusCode: 200, data: balance };
};

/**
 * Get Stock Balance
 * @param req - The request object
 * @returns The response object
 */
export const getStockBalances = (req: QUEUE_REQUEST) => {
  return { statusCode: 200, data: STOCK_BALANCES };
};

/**
 * Get Stock Balance By User Id
 * @param req - The request object
 * @returns The response object
 */
export const getStockBalancebyUserId = (req: QUEUE_REQUEST) => {
  const userId = req.params.userId as string;

  const userExists = INR_BALANCES[userId];
  const stocksExists = STOCK_BALANCES[userId];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with Id ${userId} does not exist` },
    };
  }
  if (!stocksExists) {
    return {
      statusCode: 200,
      data: { message: `No stocks for user with userId ${userId}` },
    };
  }

  return { statusCode: 200, data: STOCK_BALANCES[userId] };
};

/**
 * Om Ramp Wallet
 * @param req - The request object
 * @returns The response object
 */
export const onRamp = (req: QUEUE_REQUEST) => {
  const userId = req.body.userId as string;
  const amount = req.body.amount as number;

  const userExists = INR_BALANCES[userId];

  if (!userExists) {
    return {
      statusCode: 400,
      data: { error: `User with ID ${userId} does not exist` },
    };
  }

  INR_BALANCES[userId].balance += amount;

  return {
    statusCode: 200,
    data: {
      message: `Onramped ${userId} with amount ${amount}`,
    },
  };
};
