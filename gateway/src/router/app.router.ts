import express, { Response } from "express";
import authRouter from "./auth.router";
import balanceRouter from "./balance.router";
import orderbookRouter from "./orderbook.router";
import ordersRouter from "./orders.router";

import forwardRequest from "../controllers";
import { authenticate, requireAdmin, requireSelfOrAdmin, adminRateLimiter, generalRateLimiter } from "../middleware";
import { validate } from "../middleware/validation.middleware";
import { onrampSchema, mintSchema } from "../schemas";

const router = express.Router();

// Auth routes (public)
router.use("/auth", authRouter);

// Create user (admin only)
router.post("/user/create/:userId", authenticate, requireAdmin, adminRateLimiter, async (req, res) => {
  await forwardRequest(req, res, "/user/create/:userId");
});

// Create Symbol (admin only)
router.post("/symbol/create/:stockSymbol", authenticate, requireAdmin, adminRateLimiter, async (req, res) => {
  await forwardRequest(req, res, "/symbol/create/:stockSymbol");
});

// Onramp Money (authenticated, self or admin)
router.post("/onramp/inr", authenticate, requireSelfOrAdmin, generalRateLimiter, validate(onrampSchema), async (req, res) => {
  await forwardRequest(req, res, "/onramp/inr");
});

// Mint tokens (admin only)
router.post("/trade/mint", authenticate, requireAdmin, adminRateLimiter, validate(mintSchema), async (req, res) => {
  await forwardRequest(req, res, "/trade/mint");
});

// Reset database (admin only)
router.post("/reset", authenticate, requireAdmin, adminRateLimiter, async (req, res) => {
  await forwardRequest(req, res, "/reset");
});

// Balances (INR and Stock)
router.use("/balances", balanceRouter);

// Orderbook (View Orderbook - public)
router.use("/orderbook", orderbookRouter);

// Orders (Buy, Sell, Cancel)
router.use("/order", ordersRouter);

export default router;
