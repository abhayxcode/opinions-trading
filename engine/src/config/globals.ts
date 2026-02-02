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
