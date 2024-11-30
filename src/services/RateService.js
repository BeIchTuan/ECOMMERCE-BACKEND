const Rate = require("../models/RateModel");
const Product = require("../models/ProductModel");

class RateService {
  // Thêm đánh giá mới
  async createRate(userId, productId, orderId, star, comment) {
    // Kiểm tra nếu sản phẩm tồn tại
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found!");
    }

    // Tạo đánh giá mới
    const newRate = new Rate({
      user: userId,
      product: productId,
      order: orderId,
      star,
      comment,
    });

    const savedRate = await newRate.save();

    // Cập nhật mảng `rates` trong Product
    await Product.findByIdAndUpdate(productId, {
      $push: { rates: savedRate._id },
    });

    // Cập nhật lại số sao trung bình của sản phẩm
    await this.updateProductAverageStar(productId);

    // Trả về kết quả theo định dạng yêu cầu
    return savedRate;
  }
  //Cập nhật sao cho sản phẩm
  async updateProductAverageStar(productId) {
    // Lấy tất cả các đánh giá liên quan đến sản phẩm này
    const rates = await Rate.find({ product: productId });

    // Nếu không có đánh giá nào, đặt averageStar thành 0 và rateCount là 0
    if (rates.length === 0) {
      await Product.findByIdAndUpdate(productId, {
        averageStar: 0,
        rateCount: 0,
      });
      return; // Kết thúc hàm nếu không có đánh giá
    }

    // Tính tổng số sao từ tất cả các đánh giá
    const totalStars = rates.reduce((sum, rate) => sum + rate.star, 0);

    // Tính trung bình số sao, làm tròn đến 1 chữ số thập phân nếu cần
    const averageStar = parseFloat((totalStars / rates.length).toFixed(1));

    // Cập nhật sản phẩm với averageStar và rateCount mới
    await Product.findByIdAndUpdate(productId, {
      averageStar: averageStar,
      rateCount: rates.length,
    });
  }
  //Xóa đánh giá dành cho người dùng
  async deleteRate(rateId, userId) {
    const rate = await Rate.findById(rateId);
    if (!rate) {
      throw new Error("Rate not found");
    }

    // Kiểm tra quyền sở hữu, chỉ cho phép người tạo đánh giá mới được xóa
    if (rate.user.toString() !== userId) {
      throw new Error("You do not have permission to delete this rating");
    }

    const productId = rate.product; // Lưu lại ID sản phẩm để cập nhật số sao trung bình

    // Xóa đánh giá
    await rate.deleteOne();

    // Cập nhật số sao trung bình của sản phẩm
    await this.updateProductAverageStar(productId);

    return { message: "Rating deleted successfully" };
  }
  // Lấy tất cả đánh giá của một sản phẩm
  async getRatesByProduct(productId) {
    return await Rate.find({ product: productId })
      .populate({ path: "user", select: "name avatar" }) // Hiển thị tên người dùng đánh giá
      .exec();
  }
  //Xóa đánh giá
  async deleteComment(rateId, userId) {
    // Tìm sản phẩm theo ID và xác minh chủ sở hữu
    try {
      const rate = await Rate.findById(rateId).populate("product");

      if (!rate) {
        throw new Error("Rate not found");
      }

      const product = rate.product;

      // Kiểm tra nếu userId là chủ sở hữu của sản phẩm
      if (product.seller.toString() !== userId.toString()) {
        throw new Error("You do not have permission to delete this comment");
      }

      // Xóa comment (rate)
      const deletedRate = await Rate.findByIdAndDelete(rateId);

      // Cập nhật lại rates trong product sau khi xóa
      product.rates = product.rates.filter(
        (rate) => rate.toString() !== rateId
      );

      // Cập nhật lại số lượng và điểm trung bình sau khi xóa
      await this.updateProductAverageStar(product);

      await product.save();

      return deletedRate;
    } catch (error) {
      throw new Error("Error deleting products: " + error.message);
    }
  }
  //Trả lời đánh giá
  async replyToRate(rateId, userId, replyContent) {
    // Tìm đánh giá và lấy thông tin sản phẩm được đánh giá
    const rate = await Rate.findById(rateId)
      .populate("product")
      .populate("order");

    if (!rate) {
      throw new Error("Rate not found");
    }

    const product = rate.product;
    const order = rate.order;

    // Kiểm tra nếu không có sản phẩm hoặc đơn hàng liên quan
    if (!product || !order) {
      throw new Error("Invalid rate: missing product or order information");
    }

    // Kiểm tra nếu người dùng là chủ sở hữu của sản phẩm
    if (product.seller.toString() !== userId.toString()) {
      throw new Error("You do not have permission to reply to this comment");
    }

    // Cập nhật nội dung phản hồi
    rate.reply = replyContent;
    await rate.save();

    return rate;
  }

  // Cập nhật đánh giá cho người dùng
  async updateRate(rateId, userId, updatedData) {
    const rate = await Rate.findById(rateId).populate("product");
    if (!rate) {
      throw new Error("Rate not found");
    }

    // Kiểm tra xem người dùng có phải là người đã tạo đánh giá không
    if (rate.user.toString() !== userId.toString()) {
      throw new Error("You do not have permission to update this rating");
    }

    // Cập nhật các trường đánh giá
    rate.star = updatedData.star || rate.star;
    rate.comment = updatedData.comment || rate.comment;

    await this.updateProductAverageStar(rate.product._id);

    await rate.save();
    return rate;
  }

  // Cập nhật phản hồi cho seller
  async updateReply(rateId, userId, replyContent) {
    const rate = await Rate.findById(rateId).populate("product");
    if (!rate) {
      throw new Error("Rate not found");
    }

    const product = rate.product;

    // Kiểm tra nếu người dùng là chủ sở hữu của sản phẩm
    if (product.seller.toString() !== userId.toString()) {
      throw new Error("You do not have permission to update this reply");
    }

    // Cập nhật nội dung phản hồi
    rate.reply = replyContent;
    await rate.save();

    return rate;
  }
}

module.exports = new RateService();
