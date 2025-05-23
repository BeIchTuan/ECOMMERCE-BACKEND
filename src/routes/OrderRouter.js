const express = require("express");
const router = express.Router();
const OrderController = require("../controllers/OrderController");
const { authMiddleware } = require('../middlewares/authMiddleware');

//get methods
router.get("/orders/methods/delivery", OrderController.getDeliveryMethods);
router.get("/orders/methods/payment", OrderController.getPaymentMethods);

//get shipping fee
router.post("/shippingFee", OrderController.calculateShipping);


//Route for customer
router.get("/orders", authMiddleware(['user']), OrderController.getOrders);
router.post("/orders", authMiddleware(['user']), OrderController.createOrder);
router.put("/orders/:id", authMiddleware(['user']), OrderController.cancelOrder);
router.get("/orders/:id", authMiddleware(['user', 'seller']), OrderController.getOrderDetails);

//Route for seller
//Get all orders
router.get("/seller/orders", authMiddleware(['seller']), OrderController.getOrdersBySeller);
router.put("/orders/:orderId/status", authMiddleware(['user', 'seller']), OrderController.updateOrderStatus);

router.post("/orders/momo", authMiddleware(['user']), OrderController.payWithMomo);


module.exports = router;
