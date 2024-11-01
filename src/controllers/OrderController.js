const OrderService = require("../services/OrderService");

class OrderController {
  async getOrders(req, res) {
    try {
      const userId = req.id; // Lấy userId từ middleware xác thực
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;

      const result = await OrderService.getOrders(userId, page, limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve orders",
      });
    }
  }

  async createOrder(req, res) {
    try {
      const { items, address, paymentMethod, shippingCost } = req.body;
      const userId = req.id;

      const orderData = await OrderService.createOrder(
        userId,
        items,
        address,
        paymentMethod,
        shippingCost
      );

      res.status(201).json({
        status: "success",
        ...orderData,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  }
}

module.exports = new OrderController();
