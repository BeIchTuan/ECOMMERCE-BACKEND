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
        rate,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
}

module.exports = new RateController();
