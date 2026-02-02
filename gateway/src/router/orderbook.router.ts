import express from "express";
import forwardRequest from "../controllers";
import { generalRateLimiter } from "../middleware";

const router = express.Router();

// Orderbook (public, rate limited)
router.get("/", generalRateLimiter, async (req, res) => {
  await forwardRequest(req, res, "/orderbook");
});
router.get("/:stockSymbol", generalRateLimiter, async (req, res) => {
  await forwardRequest(req, res, "/orderbook/:stockSymbol");
});

export default router;
