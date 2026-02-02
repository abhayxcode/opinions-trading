import express from "express";

import forwardRequest from "../controllers";
import { authenticate } from "../middleware";
import { validate } from "../middleware/validation.middleware";
import { buyOrderSchema, sellOrderSchema, cancelOrderSchema } from "../schemas";

const router = express.Router();

// Orders (all require authentication)
router.post("/buy", authenticate, validate(buyOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/buy");
});

router.post("/sell", authenticate, validate(sellOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/sell");
});

router.post("/cancel", authenticate, validate(cancelOrderSchema), async (req, res) => {
  await forwardRequest(req, res, "/order/cancel");
});

export default router;
