const { json } = require("body-parser");
const ProductService = require("../services/ProductService");
const cloudinary = require("../config/cloudinary");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/uploadImage");

class ProductController {
  // Tạo sản phẩm mới
  async createProduct(req, res) {
    const {
      name,
      price,
      inStock,
      description,
      category,
      SKU,
      image,
      salePercent,
    } = req.body;

    // Kiểm tra nếu các trường bắt buộc chưa được nhập
    if (!name || !price || !inStock || !category) {
      return res.status(400).json({
        status: "error",
        message: "Name, price, inStock, SKU, and category are required fields!",
      });
    }

    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực
      // const product = await ProductService.createProduct(req.body, sellerId);
      const imageUrls = [];

      // Tải từng ảnh lên Cloudinary
      for (const file of req.files) {
        const result = await uploadToCloudinary(file, "products");
        imageUrls.push(result.secure_url); // Lấy URL ảnh từ Cloudinary
      }

      let parsedSKU;
      try {
        parsedSKU = JSON.parse(SKU);
      } catch (error) {
        return res.status(400).json({
          status: "error",
          message: "SKU must be a valid JSON string!",
        });
      }

      // Lưu sản phẩm với URL ảnh
      const product = await ProductService.createProduct(
        { ...req.body, SKU: parsedSKU, image: imageUrls },
        sellerId
      );
      return res.status(201).json({
        status: "success",
        message: "Product added successfully",
        productId: product._id,
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(req, res) {
    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực
      const productId = req.params.id;

      const productData = req.body; // Lấy thông tin sản phẩm từ body
      let newImageUrls = [];
      let imagesToDelete = req.body.imagesToDelete || []; // Danh sách ảnh cần xóa (nếu có)

      // Kiểm tra nếu có file tải lên
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await uploadToCloudinary(file, "products"); // Tải lên Cloudinary
          newImageUrls.push(result.secure_url); // Lưu URL của ảnh mới
        }
      }

      // Gửi yêu cầu cập nhật sản phẩm
      const updatedProduct = await ProductService.updateProduct(
        productId,
        sellerId,
        productData,
        newImageUrls,
        imagesToDelete
      );

      return res.status(200).json({
        status: "success",
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  // Xóa sản phẩm
  async deleteProduct(req, res) {
    try {
      const sellerId = req.id; // Lấy sellerId từ token đã xác thực
      const productId = req.params.id;
      await ProductService.deleteProduct(productId, sellerId);
      return res.status(200).json({
        status: "success",
        message: "Product deleted successfully",
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Failed to delete product: " + error.message,
      });
    }
  }
  //Lấy tất cả sản phẩm trong shop
  async getAllShopProduct(req, res) {
    try {
      const sellerId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const itemsPerPage = parseInt(req.query.itemsPerPage) || 15;

      const result = await ProductService.getAllShopProducts(
        sellerId,
        page,
        itemsPerPage
      );

      return res.status(200).json({
        status: "success",
        message: "Get products successfully",
        pagination: result.pagination,
        products: result.products,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  //Lấy danh sách sản phẩm khuyến nghị cho khách hàng
  async getRecommendedProducts(req, res) {
    try {
      const userId = req.id; // Lấy id user

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;

      const result = await ProductService.getRecommendedProducts(
        page,
        limit,
        userId
      );
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  //Lấy chi tiết sản phẩm
  async getProductDetails(req, res) {
    try {
      const productId = req.params.id; // Lấy sellerId
      const userId = req.id;
      const product = await ProductService.getProductDetails(productId, userId);
      return res.status(200).json({
        status: "success",
        message: "Get product details successfully",
        product: product,
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  }

  //Tìm sản phẩm
  async searchProducts(req, res) {
    try {
      const userId = req.id || null;
      const {
        name,
        minPrice,
        maxPrice,
        stars,
        //shopAddress,
        discount,
        filter,
        categoryId,
        page = 1,
        itemsPerPage = 15,
      } = req.query;

      const products = await ProductService.searchProducts({
        userId,
        name,
        categoryId,
        page,
        itemsPerPage,
        minPrice,
        maxPrice,
        stars,
        //shopAddress,
        discount,
        filter,
      });

      res.json({
        status: "success",
        products: products.products,
        pagination: products.pagination,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
}

module.exports = new ProductController();
