const Discount = require("../models/DiscountModel");

class DiscountService {
  async createDiscount(data) {
    try {
      // Tạo mã giảm giá từ dữ liệu được cung cấp
      const discount = new Discount(data);
      return await discount.save(); // Lưu mã giảm giá vào database
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAllDiscounts(page = 1, limit = 15) {
    try {
      const skip = (page - 1) * limit; // Số lượng bản ghi cần bỏ qua
      const totalDiscounts = await Discount.countDocuments(); // Tổng số mã giảm giá
      const totalPages = Math.ceil(totalDiscounts / limit); // Tổng số trang

      // Lấy danh sách mã giảm giá dựa trên phân trang
      const discounts = await Discount.find().skip(skip).limit(limit);

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

  async updateDiscount(id, data) {
    try {
      // Tìm và cập nhật mã giảm giá theo ID
      const updatedDiscount = await Discount.findByIdAndUpdate(id, data, {
        new: true,
      });
      if (!updatedDiscount) {
        throw new Error("Không tìm thấy mã giảm giá để cập nhật");
      }
      return updatedDiscount;
    } catch (error) {
      throw new Error("Không thể cập nhật mã giảm giá: " + error.message);
    }
  }

  async deleteDiscount(id) {
    try {
      // Tìm và xóa mã giảm giá theo ID
      const deletedDiscount = await Discount.findByIdAndDelete(id);
      if (!deletedDiscount) {
        throw new Error("Không tìm thấy mã giảm giá để xóa");
      }
      return deletedDiscount;
    } catch (error) {
      throw new Error("Không thể xóa mã giảm giá: " + error.message);
    }
  }
}

module.exports = new DiscountService();
