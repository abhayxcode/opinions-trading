import { INR_BALANCES, ORDERBOOK, STOCK_BALANCES, USERS } from "../config/globals";
import { MINT_REQUEST, QUEUE_REQUEST } from "../interfaces/requestModels";

/**
 * Create A new User
 * @param req - The request object
 * @returns The response object
 */
export const createUser = (req: QUEUE_REQUEST) => {
  const userId = req.params.userId as string;

  if (!userId) {
    return { statusCode: 404, data: { error: "Invalid user Id" } };
  }

  const userExists = INR_BALANCES[userId];

  if (userExists) {
    return { statusCode: 409, data: { error: "User Already Exists" } };
  }

  INR_BALANCES[userId] = { balance: 0, locked: 0 };
  STOCK_BALANCES[userId] = {};
  return { statusCode: 201, data: { message: `User ${userId} created` } };
};

/**
 * Create A new Symbol
 * @param req - The request object
 * @returns The response object
 */
export const createSymbol = (req: QUEUE_REQUEST) => {
  const stockSymbol = req.params.stockSymbol as string;

  if (!stockSymbol) {
    return { statusCode: 404, data: { error: "Invalid Symbol" } };
  }

  const symbolExists = ORDERBOOK[stockSymbol];

  if (symbolExists) {
    return { statusCode: 409, data: { error: "Symbol Already Exists" } };
  }

  ORDERBOOK[stockSymbol] = {
    yes: new Map(),
    no: new Map(),
  };

  return {
    statusCode: 201,
    data: { message: `Symbol ${stockSymbol} created` },
  };
};

/**
 * Mint New Stocks of a given symbol
 * @param req - The request object
 * @returns The response object
 */
export const mintToken = (req: QUEUE_REQUEST) => {
  const { userId, stockSymbol } = req.body as MINT_REQUEST;
  const quantity = Number(req.body.quantity);
  const price = Number(req.body.price) || 10;

  if (!userId || !stockSymbol || !quantity || !price) {
    return { statusCode: 400, data: { error: `Invalid Input` } };
  }

  const userExists = INR_BALANCES[userId];
  const symbolExists = ORDERBOOK[stockSymbol];

  if (!userExists) {
    return {
      statusCode: 404,
      data: { error: `User for Id ${userId} does not exist` },
    };
  }
  if (!symbolExists) {
    return {
      statusCode: 404,
      data: { error: `Symbol with symbol ${stockSymbol} does not exist` },
    };
  }

  const requiredBalance = quantity * price;
  const userBalance = INR_BALANCES[userId].balance / 100;

  if (requiredBalance > userBalance) {
    return { statusCode: 200, data: { message: "Insufficient INR Balance" } };
  }

  if (!STOCK_BALANCES?.[userId]?.[stockSymbol]) {
    STOCK_BALANCES[userId] = {
      [stockSymbol]: {
        yes: {
          quantity,
          locked: 0,
        },
        no: {
          quantity,
          locked: 0,
        },
      },
    };
  } else {
    const initalYesStocks = STOCK_BALANCES[userId][stockSymbol]?.yes;
    const initalNoStocks = STOCK_BALANCES[userId][stockSymbol].no;

    STOCK_BALANCES[userId][stockSymbol].yes = {
      quantity: (initalYesStocks?.quantity || 0) + quantity,
      locked: initalYesStocks?.locked || 0,
    };

    STOCK_BALANCES[userId][stockSymbol].no = {
      quantity: (initalNoStocks?.quantity || 0) + quantity,
      locked: initalNoStocks?.locked || 0,
    };
  }

  const remainingBalance = userBalance - requiredBalance;
  INR_BALANCES[userId].balance = remainingBalance * 100;

  return {
    statusCode: 200,
    data: {
      message: `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${remainingBalance}`,
    },
  };
};

/**
 * Reset all in memory schemas
 * @param req - The request object
 * @returns The response object
 */
export const reset = (req: QUEUE_REQUEST) => {
  for (let prop in ORDERBOOK) {
    delete ORDERBOOK[prop];
  }

  for (let prop in INR_BALANCES) {
    delete INR_BALANCES[prop];
  }

  for (let prop in STOCK_BALANCES) {
    delete STOCK_BALANCES[prop];
  }

  for (let prop in USERS) {
    delete USERS[prop];
  }

  return { statusCode: 200, data: { message: "Reset Successfully" } };
};
