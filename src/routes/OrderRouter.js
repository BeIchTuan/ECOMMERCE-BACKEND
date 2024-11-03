const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const { authMiddleware } = require('../middlewares/authMiddleware');

//Route for customer
router.get("/orders", authMiddleware(['user']), OrderController.getOrders);
router.post("/orders", authMiddleware(['user']), OrderController.createOrder);
router.get("/orders/:id", authMiddleware(['user']), OrderController.getOrderDetails);
router.put("/orders/:id", authMiddleware(['user']), OrderController.cancelOrder);

//Route for seller
router.get("/seller/orders", authMiddleware(['seller']), OrderController.getOrdersBySeller);
router.put("/orders/:orderId/status", authMiddleware(['user', 'seller']), OrderController.updateOrderStatus);


module.exports = router;
