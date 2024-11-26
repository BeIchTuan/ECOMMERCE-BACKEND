const RateService = require("../services/RateService");

class RateController {
  // Tạo đánh giá mới cho sản phẩm
  async createRate(req, res) {
    try {
      const { star, comment } = req.body;
      const userId = req.id; // Giả sử có middleware xác thực thêm ID người dùng vào yêu cầu
      const productId = req.params.productId;

      // Gọi service để tạo đánh giá
      const rate = await RateService.createRate(
        userId,
        productId,
        star,
        comment
      );
      res.status(201).json({
        status: "success",
        message: "Review submitted successfully",
        rate
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  // Xóa đánh giá của user
  async deleteRate(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.id; // Giả sử `req.user.id` là ID người dùng đã xác thực

      // Gọi service để xóa đánh giá
      const result = await RateService.deleteRate(reviewId, userId);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in deleteRate controller:", error.message);
      return res.status(500).json({ message: error.message });
    }
  }
  // Lấy tất cả đánh giá của một sản phẩm
  async getRatesByProduct(req, res) {
    try {
      const productId = req.params.productId;

      // Gọi service để lấy danh sách đánh giá
      const rates = await RateService.getRatesByProduct(productId);
      res.status(200).json(rates);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  //Xóa đánh giá của seller
  async deleteComment(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.id;

      await RateService.deleteComment(reviewId, userId);

      res.status(200).json({
        status: "success",
        message: "Review deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: "Failed to delete review",
        message: error.message,
      });
    }
  }
  //Trả lời đánh giá
  async replyToRate(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.id; // userId của seller (giả sử bạn đã xác thực và lưu userId trong req.user)
      const { replyContent } = req.body; // Nội dung phản hồi được gửi từ client

      await RateService.replyToRate(reviewId, userId, replyContent);

      res.status(200).json({
        status: "success",
        message: "Reply sent successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: "Failed to send reply",
        message: error.message,
      });
    }
  }

  async updateRate(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.id; // Giả sử userId đã được xác thực và lưu trong req.user
      const { star, comment } = req.body; // Nhận dữ liệu cập nhật từ body

      await RateService.updateRate(reviewId, userId, {
        star,
        comment,
      });

      res.status(200).json({
        status: "success",
        message: "Rating updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }
  // Cập nhật phản hồi của seller
  async updateReply(req, res) {
    try {
      const { reviewId } = req.params;
      const userId = req.id; // Giả sử userId của seller đã được xác thực
      const { replyContent } = req.body; // Nhận nội dung phản hồi từ body

      const updatedRate = await RateService.updateReply(
        reviewId,
        userId,
        replyContent
      );

      res.status(200).json({
        status: "success",
        message: "Reply updated successfully",
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }
}

module.exports = new RateController();
