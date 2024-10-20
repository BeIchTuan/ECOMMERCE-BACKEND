const Product = require("../models/ProductModel");

class ProductService {
  // Tạo sản phẩm mới
  async createProduct(data) {
    try {
      const product = new Product(data);
      return await product.save();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Lấy tất cả sản phẩm
  async getProducts() {
    try {
      return await Product.find();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Lấy sản phẩm theo ID
  async getProductById(productId) {
    try {
      return await Product.findById(productId);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(productId, data) {
    try {
      return await Product.findByIdAndUpdate(productId, data, { new: true });
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Xóa sản phẩm
  async deleteProduct(productId) {
    try {
      return await Product.findByIdAndDelete(productId);
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = new ProductService();


