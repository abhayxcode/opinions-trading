import express from "express";

import forwardRequest from "../controllers";
import { authenticate, orderRateLimiter } from "../middleware";
import { validate } from "../middleware/validation.middleware";
import { buyOrderSchema, sellOrderSchema, cancelOrderSchema } from "../schemas";

const router = express.Router();

// Orders (all require authentication, rate limited)
router.post("/buy", authenticate, orderRateLimiter, validate(buyOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/buy");
});

router.post("/sell", authenticate, orderRateLimiter, validate(sellOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/sell");
});

router.post("/cancel", authenticate, orderRateLimiter, validate(cancelOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/cancel");
});

export default router;
