const { json } = require("body-parser");
const ProductService = require("../services/ProductService");

class ProductController {
  // Tạo sản phẩm mới
  async createProduct(req, res) {    
    const { name, price, inStock, description, category, SKU, image } = req.body;

    // Kiểm tra nếu các trường bắt buộc chưa được nhập
    if (!name || !price || !inStock || !SKU || !category) {
      return res.status(400).json({
        status: "error",
        message: "Name, price, inStock, SKU, and category are required fields!",
      });
    }

    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực

      const product = await ProductService.createProduct(req.body, sellerId);
      return res.status(201).json({
        status: "success",
        message: "Product added successfully",
        productId: product._id,
      });
    } catch (error) {
      return res.status(500).json({ 
        message: error.message });
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(req, res) {
    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực
      const productId = req.params.id;

      const product = await ProductService.updateProduct(productId, sellerId, req.body);
      return res.status(200).json({
        status: 'success',
        message: "Product updated successfully",
        data: product
      });
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // Xóa sản phẩm
  async deleteProduct(req, res) {
    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực
      const productId = req.params.id
      await ProductService.deleteProduct(productId, sellerId);
      return res.status(200).json({
        status: 'success',
        message: 'Product deleted successfully'
      });
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Failed to delete product: ' + error.message
      });
    }
  };

  async getAllShopProduct(req, res) {
    try {
      const sellerId = req.params.id; // Lấy id seller

      const product = await ProductService.getAllShopProducts(sellerId);
      return res.status(200).json({
        status: 'success',
        message: "Get products successfully",
        data: product
      });
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  };

  async getProductDetails(req, res) {
    try {
      const productId = req.params.id; // Lấy sellerId

      const product = await ProductService.getProductDetails(productId);
      return res.status(200).json({
        status: 'success',
        message: "Get product details successfully",
        product: product
      });
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }
  };
}

module.exports = new ProductController();
