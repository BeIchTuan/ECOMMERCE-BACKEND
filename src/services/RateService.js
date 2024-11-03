const Rate = require("../models/RateModel");
const Product = require("../models/ProductModel");

class RateService {
  // Thêm đánh giá mới
  async createRate(userId, productId, star, comment) {
    // Kiểm tra nếu sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found!");
    }

    // Tạo đánh giá mới
    const newRate = new Rate({
      user: userId,
      product: productId,
      star,
      comment,
    });

    // Cập nhật mảng `rates` trong Product
    await Product.findByIdAndUpdate(productId, {
      $push: { rates: newRate._id },
    });

    // Cập nhật lại số sao trung bình của sản phẩm
    await this.updateProductAverageStar(productId);

    // Lưu đánh giá vào cơ sở dữ liệu
    return await newRate.save();
  }

  async updateProductAverageStar(productId) {
    // Lấy tất cả các đánh giá của sản phẩm
    const rates = await Rate.find({ product: productId });

    // Tính tổng số sao
    const totalStars = rates.reduce((sum, rate) => sum + rate.star, 0);

    // Tính số sao trung bình
    const averageStar = rates.length > 0 ? totalStars / rates.length : 0;

    // Cập nhật lại `averageStar` và `rateCount` của sản phẩm
    await Product.findByIdAndUpdate(productId, {
      averageStar: averageStar.toFixed(1), // Làm tròn đến 1 chữ số thập phân
      rateCount: rates.length,
    });
  }
  // Lấy tất cả đánh giá của một sản phẩm
  async getRatesByProduct(productId) {
    return await Rate.find({ product: productId })
      .populate("user", "name") // Hiển thị tên người dùng đánh giá
      .exec();
  }
}

module.exports = new RateService();
