const OrderService = require("../services/OrderService");
const PaymentMethod = require("../models/PaymentMethodModel");
const DeliveryMethod = require("../models/DeliveryMethodModel");

class OrderController {
  async getOrders(req, res) {
    try {
      const userId = req.id; // Lấy userId từ middleware xác thực
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;

      const deliveryStatus = req.query.deliveryStatus; // Lấy `deliveryStatus` từ query parameters

      const isRated =
      req.query.isRated !== undefined
        ? req.query.isRated === "true"
        : null;

      const result = await OrderService.getOrders(
        userId,
        page,
        limit,
        deliveryStatus,
        isRated,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve orders",
        error: error
      });
    }
  }

  async createOrder(req, res) {
    try {
      const { items, address, paymentMethodId, deliveryMethodId, discountId } =
        req.body;
      const userId = req.id;

      const orderData = await OrderService.createOrder(
        userId,
        items,
        address,
        paymentMethodId,
        deliveryMethodId,
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
      const validStatuses = [
        "pending",
        "preparing",
        "delivering",
        "delivered",
        "success",
      ];
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

  async getPaymentMethods(req, res) {
    try {
      const paymentMethods = await PaymentMethod.find({});
      return res.status(200).json({
        success: true,
        paymentMethods: paymentMethods,
      });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment methods.",
      });
    }
  }

  async getDeliveryMethods(req, res) {
    try {
      const deliveryMethods = await DeliveryMethod.find({});
      return res.status(200).json({
        success: true,
        deliveryMethods: deliveryMethods,
      });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment methods.",
      });
    }
  }

  // Controller method to handle the request
  async calculateShipping(req, res) {
    const { shopAddress, destination, deliveryMethodId } = req.body;
    try {
      // Calculate the shipping cost
      const shippingCost = OrderService.calculateShippingCost(
        shopAddress,
        destination,
        deliveryMethodId
      );
      res.status(200).json({ status: "success", shippingFee: shippingCost });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new OrderController();
