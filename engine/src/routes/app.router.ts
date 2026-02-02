import express from "express";
import {
  createUser,
  createSymbol,
  mintToken,
  reset,
} from "../controllers/auth";
import {
  getInrBalanceByUserId,
  getInrBalances,
  getStockBalancebyUserId,
  getStockBalances,
  onRamp,
} from "../controllers/balance";
import {
  buyOrder,
  cancelOrder,
  getOrderBook,
  sellOrder,
  viewOrders,
} from "../controllers/orders";
import { registerUser, loginUser } from "../controllers/user.controller";
import { QUEUE_DATA_ELEMENT } from "../interfaces/requestModels";
import { publisher } from "../services/redis";

/**
 * Match all endpoints
 * @param data - The data object
 */
export const matchEndpoint = async (data: QUEUE_DATA_ELEMENT) => {
  let response;
  switch (data.endpoint) {
    // Auth endpoints
    case "/auth/register":
      response = await registerUser(data.req);
      break;
    case "/auth/login":
      response = await loginUser(data.req);
      break;

    // Create user and symbol
    case "/user/create/:userId":
      response = createUser(data.req);
      break;
    case "/symbol/create/:stockSymbol":
      response = createSymbol(data.req);
      break;

    // Balances (INR and Stock)
    case "/balances/inr":
      response = getInrBalances(data.req);
      break;
    case "/balances/inr/:userId":
      response = getInrBalanceByUserId(data.req);
      break;
    case "/balances/stock":
      response = getStockBalances(data.req);
      break;
    case "/balances/stock/:userId":
      response = getStockBalancebyUserId(data.req);
      break;
    case "/onramp/inr":
      response = onRamp(data.req);
      break;

    // Orderbook (View Orderbook)
    case "/orderbook":
      response = getOrderBook(data.req);
      break;
    case "/orderbook/:stockSymbol":
      response = viewOrders(data.req);
      break;

    // Orders (Buy, Sell, Cancel)
    case "/order/buy":
      response = buyOrder(data.req);
      break;
    case "/order/sell":
      response = sellOrder(data.req);
      break;
    case "/order/cancel":
      response = cancelOrder(data.req);
      break;

    // Extra endpoints (Mint)
    case "/trade/mint":
      response = mintToken(data.req);
      break;

    // Reset all in memory schemas
    case "/reset":
      response = reset(data.req);
      break;
  }

  publisher.publish(data._id, JSON.stringify(response));
};
