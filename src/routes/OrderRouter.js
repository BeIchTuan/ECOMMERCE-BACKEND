const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get("/orders", authMiddleware(['user']), OrderController.getOrders);
router.post("/orders", authMiddleware(['user']), OrderController.createOrder);

module.exports = router;
