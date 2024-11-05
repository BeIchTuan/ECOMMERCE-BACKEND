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
      const { items, address, paymentMethod, shippingCost, discountId} = req.body;
      const userId = req.id;

      const orderData = await OrderService.createOrder(
        userId,
        items,
        address,
        paymentMethod,
        shippingCost,
        discountId
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

  async getOrderDetails(req, res) {
    try {
      const orderId = req.params.id; // assuming orderId is passed as a URL parameter
      const orderDetails = await OrderService.getOrderDetails(orderId);

      res.status(200).json({
        status: "success",
        ...orderDetails,
      });
    } catch (error) {
      res
        .status(500)
        .json({ status: "error", message: "Failed to retrieve order" });
    }
  }

  async cancelOrder(req, res) {
    try {
      const orderId = req.params.id; // assuming orderId is passed as a URL parameter
      const result = await OrderService.cancelOrder(orderId);

      if (result.success) {
        res.status(200).json({
          status: "success",
          message: "Order has been canceled successfully",
        });
      } else {
        res.status(400).json({
          status: "error",
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error canceling order:", error);
      res
        .status(500)
        .json({ status: "error", message: "Unable to cancel order" });
    }
  }

  async getOrdersBySeller(req, res) {
    try {
      const sellerId = req.id; // Assuming seller ID is available in the request
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;

      const result = await OrderService.getOrdersBySeller(
        sellerId,
        page,
        limit
      );

      res.status(200).json({
        status: "success",
        ...result, // Includes orders and pagination info
      });
    } catch (error) {
      console.error("Error fetching orders for seller:", error);
      res
        .status(500)
        .json({ status: "error", message: "Unable to fetch orders" });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const orderId = req.params.orderId; // assuming the order ID is passed as a URL parameter
      const { status } = req.body;

      // Validate status
      const validStatuses = ["pending", "preparing", "delivering", "delivered", "success"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid status value",
        });
      }

      const result = await OrderService.updateOrderStatus(orderId, status);

      if (result.success) {
        res.status(200).json({
          status: "success",
          message: `Order ${status} successfully`,
        });
      } else {
        res.status(404).json({
          status: "error",
          message: "Failed to accept order",
        });
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      res
        .status(500)
        .json({ status: "error", message: "Failed to accept order" });
    }
  }
}

module.exports = new OrderController();
