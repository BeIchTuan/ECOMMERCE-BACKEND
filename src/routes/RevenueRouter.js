const express = require("express");
const router = express.Router();
const revenueController = require("../controllers/RevenueController");
const { authMiddleware } = require("../middlewares/authMiddleware"); // Giả định middleware tồn tại
const OrderService = require("../services/OrderService");

router.get(
  "/revenue",
  authMiddleware(["seller"]),
  revenueController.getRevenueReport
);
router.get(
  "/revenue/chart",
  authMiddleware(["seller"]),
  revenueController.getRevenueChart
);

// Lấy doanh thu từ Momo của người bán
router.get(
  "/revenue/momo-revenue",
  authMiddleware(["seller"]),
  revenueController.getMomoRevenue
);

module.exports = router;
