import {
  INR_BALANCES_TYPE,
  ORDER_BOOK_TYPE,
  STOCK_BALANCES_TYPE,
  USERS_TYPE,
} from "../interfaces/globals";

// In-memory balances
export const INR_BALANCES: INR_BALANCES_TYPE = {};

// In-memory stock balances
export const STOCK_BALANCES: STOCK_BALANCES_TYPE = {};

// In-memory orderbook
export let ORDERBOOK: ORDER_BOOK_TYPE = {};

// In-memory users store
export const USERS: USERS_TYPE = {};

/**
 * Reset all in-memory state - useful for testing
 */
export const resetAllState = () => {
  for (const prop in ORDERBOOK) {
    delete ORDERBOOK[prop];
  }
  for (const prop in INR_BALANCES) {
    delete INR_BALANCES[prop];
  }
  for (const prop in STOCK_BALANCES) {
    delete STOCK_BALANCES[prop];
  }
  for (const prop in USERS) {
    delete USERS[prop];
  }
};
