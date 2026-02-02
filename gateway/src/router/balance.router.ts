import express from "express";
import forwardRequest from "../controllers";
import { authenticate, requireAdmin, requireSelfOrAdmin } from "../middleware";

const router = express.Router();

// Get all INR balances (admin only)
router.get("/inr", authenticate, requireAdmin, async (req, res) => {
  await forwardRequest(req, res, "/balances/inr");
});

// Get INR balance by userId (self or admin)
router.get("/inr/:userId", authenticate, requireSelfOrAdmin, async (req, res) => {
  await forwardRequest(req, res, "/balances/inr/:userId");
});

// Get all stock balances (admin only)
router.get("/stock", authenticate, requireAdmin, async (req, res) => {
  await forwardRequest(req, res, "/balances/stock");
});

// Get stock balance by userId (self or admin)
router.get("/stock/:userId", authenticate, requireSelfOrAdmin, async (req, res) => {
  await forwardRequest(req, res, "/balances/stock/:userId");
});

export default router;
