const MomoService = require("../services/MomoService");
const Order = require("../models/OrderModel");

class PaymentController {
  static async createPayment(req, res) {
    try {
      const { amount, orderInfo } = req.body;
      const result = await MomoService.createPayment(amount, orderInfo);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: error.message,
      });
    }
  }

  static async handleCallback(req, res) {
    try {
      console.log("=== START PAYMENT CALLBACK ===");
      console.log("Headers:", req.headers);
      console.log("Body:", req.body);
      const { orderId, resultCode, message } = req.body;

      console.log("Looking for order with orderId:", orderId);
      const order = await Order.findOne({
        "paymentData.orderId": orderId,
      }).populate({
        path: "userId",
        select: "fcmTokens _id",
      });
      console.log("Found order:", order);

      if (!order) {
        console.log("No order found for orderId:", orderId);
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy đơn hàng với orderId này",
        });
      }

      // Cập nhật trạng thái thanh toán
      const oldStatus = order.paymentStatus;
      order.paymentStatus = resultCode === 0 ? "success" : "pending";
      await order.save();
      console.log(
        `Updated payment status from ${oldStatus} to ${order.paymentStatus}`
      );

    // Gửi email nếu thanh toán thành công
    //   if (resultCode === 0) {
    //     try {
    //       console.log("Attempting to send success email...");
    //       await EmailService.sendPaymentSuccessEmail(ticket);
    //       console.log("Payment success email sent");

    //     } catch (emailError) {
    //       console.error("Error sending payment success email:", emailError);
    //       console.error(emailError.stack);
    //     }
    //   }

      console.log("=== END PAYMENT CALLBACK ===");
      return res.status(200).json({
        success: true,
        message: `Cập nhật trạng thái thanh toán thành ${order.paymentStatus}`,
        data: {
          orderId: order._id,
          paymentStatus: order.paymentStatus,
          momoMessage: message,
        },
      });
    } catch (error) {
      console.error("Payment callback error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async checkTransactionStatus(req, res) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "orderId is required",
        });
      }

      const result = await MomoService.checkTransactionStatus(orderId);
      const order = await Order.findOne({
        "paymentData.orderId": orderId,
      });

      if (order) {
        const newPaymentStatus = result.resultCode === 0 ? "success" : "pending";

        // Chỉ gửi email nếu trạng thái thay đổi từ pending sang paid
        if (order.paymentStatus !== "paid" && newPaymentStatus === "success") {
          try {
            await EmailService.sendPaymentSuccessEmail(order);
            console.log("Payment success email sent");
          } catch (emailError) {
            console.error("Error sending payment success email:", emailError);
          }
        }

        order.paymentStatus = newPaymentStatus;
        await order.save();
      }

      return res.status(200).json({
        success: true,
        data: {
          ...result,
          orderStatus: order ? order.paymentStatus : null,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = PaymentController;
