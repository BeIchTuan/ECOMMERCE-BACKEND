const { json } = require("body-parser");
const ProductService = require("../services/ProductService");

class ProductController {
  // Tạo sản phẩm mới
  async createProduct(req, res) {
    const { name, price, inStock, category, SKU } = req.body;

    // Kiểm tra nếu các trường bắt buộc chưa được nhập
    if (!name || !price || !inStock || !SKU || !category) {
      return res.status(400).json({
        status: "error",
        message: "Name, price, inStock, SKU, and category are required fields!",
      });
    }

    try {
      const product = await ProductService.createProduct(req.body);
      return res.status(201).json({
        status: "success",
        message: "Product added successfully",
        productId: product._id,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(req, res) {
    const { name, price, inStock, category, SKU } = req.body;

    // Kiểm tra nếu các trường bắt buộc chưa được nhập
    if (!name || !price || !inStock || !SKU || !category) {
      return res.status(400).json({
        status: "error",
        message: "Name, price, inStock, SKU, and category are required fields!",
      });
    }

    try {
      const product = await ProductService.updateProduct(
        req.params.id,
        req.body
      );
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  // Các phương thức khác...
}

module.exports = new ProductController();
