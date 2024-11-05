const Discount = require("../models/DiscountModel");

class DiscountService {
  async createDiscount(data, sellerId) {
    try {
      // Add the seller reference to the discount data
      const discount = new Discount({ ...data, seller: sellerId });
      return await discount.save(); // Save the discount to the database
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAllDiscounts(page = 1, limit = 15, sellerId) {
    try {
      const skip = (page - 1) * limit; // Số lượng bản ghi cần bỏ qua
      const totalDiscounts = await Discount.countDocuments({
        seller: sellerId,
      }); // Tổng số mã giảm giá
      const totalPages = Math.ceil(totalDiscounts / limit); // Tổng số trang

      // Lấy danh sách mã giảm giá dựa trên phân trang
      const discounts = await Discount.find({ seller: sellerId })
        .skip(skip)
        .limit(limit);

      return {
        discounts,
        pagination: {
          currentPage: page,
          totalPages,
          discountsPerPage: limit,
          totalDiscounts,
        },
      };
    } catch (error) {
      throw new Error("Không thể lấy danh sách mã giảm giá: " + error.message);
    }
  }

  async getDiscountById(id) {
    return await Discount.findById(id);
  }

  async updateDiscount(id, data, sellerId) {
    try {
      // Find the discount by ID and check if it belongs to the seller
      const discount = await Discount.findById(id);
      if (!discount) {
        throw new Error("Không tìm thấy mã giảm giá để cập nhật");
      }
      // Check if the discount belongs to the seller
      if (discount.seller.toString() !== sellerId) {
        throw new Error("Bạn không có quyền cập nhật mã giảm giá này");
      }

      // Update the discount if the seller is authorized
      const updatedDiscount = await Discount.findByIdAndUpdate(id, data, {
        new: true,
      });
      return updatedDiscount;
    } catch (error) {
      throw new Error("Không thể cập nhật mã giảm giá: " + error.message);
    }
  }

  async deleteDiscount(id, sellerId) {
    try {
      // Find the discount by ID and check if it belongs to the seller
      const discount = await Discount.findById(id);
      if (!discount) {
        throw new Error("Discount not found!");
      }
      // Check if the discount belongs to the seller
      if (discount.seller.toString() !== sellerId) {
        throw new Error("You are not allowed to delete this discount!");
      }

      // Delete the discount if the seller is authorized
      const deletedDiscount = await Discount.findByIdAndDelete(id);
      return deletedDiscount;
    } catch (error) {
      throw new Error("Error: " + error.message);
    }
  }
}

module.exports = new DiscountService();
