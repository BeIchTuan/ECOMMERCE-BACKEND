const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const { authMiddleware } = require('../middlewares/authMiddleware');

//Route for customer
router.get("/orders", authMiddleware(['user']), OrderController.getOrders);
router.post("/orders", authMiddleware(['user']), OrderController.createOrder);
router.get("/orders/:id", authMiddleware(['user']), OrderController.getOrderDetails);
router.delete("/orders/:id", authMiddleware(['user']), OrderController.cancelOrder);

module.exports = router;
