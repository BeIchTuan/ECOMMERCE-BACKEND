const Product = require("../models/ProductModel");
const User = require("../models/UserModel");

class ProductService {
  // Tạo sản phẩm mới
  async createProduct(data, sellerId) {
    try {
      const newProduct = new Product({
        ...data,
        seller: sellerId
      });
      
      return await newProduct.save();

    } catch (error) {
      throw new Error('Error creating product: ' + error.message);
    }
  }

  // Lấy sản phẩm theo ID
  async getProductDetails(productId) {
    try {
      return await Product.findById(productId).populate('category', 'name');;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(productId, sellerId, data) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
  
      if (product.seller.toString() !== sellerId) {
        throw new Error('You are not authorized to update this product');
      }
  
      Object.assign(product, data);
      return await product.save();
    } catch (error) {
      throw new Error('Failed to update product: ' + error.message);
    }
  };

  // Xóa sản phẩm
  async deleteProduct(productId, sellerId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
  
      // Kiểm tra xem seller có phải là người sở hữu sản phẩm không
      if (product.seller.toString() !== sellerId) {
        throw new Error('You are not authorized to delete this product');
      }
  
      // Xóa sản phẩm
      return await Product.deleteOne({ _id: productId });
    } catch (error) {
      throw new Error('Error deleting product: ' + error.message);
    }
  }  

  // Lấy tất cả sản phẩm của shop
  async getAllShopProducts(sellerId) {
    try {
      // Tìm tất cả sản phẩm của shop dựa trên sellerId
      const products = await Product.find({ seller: sellerId }).populate('category', 'name');;
      
      if (products.length === 0) {
        throw new Error('No products found for this shop');
      }
  
      return products;
    } catch (error) {
      throw new Error('Error retrieving products: ' + error.message);
    }
  }

  //Lấy danh sách sản phẩm khuyến nghị cho khách hàng
  async getRecommendedProducts(page = 1, limit = 15, userId) {
    try {
      const skip = (page - 1) * limit;

      // Tìm người dùng và lấy danh sách danh mục yêu thích
      const user = await User.findById(userId);
      const favoriteCategories = user.favoriteCategories || []; // Giả sử `favoriteCategories` chứa danh sách các ObjectId của danh mục

      // Lọc sản phẩm dựa trên danh mục yêu thích của người dùng
      const products = await Product.find({ category: { $in: favoriteCategories } })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name'); // Lấy tên của category

      // Đếm tổng số sản phẩm để tính tổng số trang
      const totalProducts = await Product.countDocuments({ category: { $in: favoriteCategories } });
      const totalPages = Math.ceil(totalProducts / limit);

      return {
        products,
        currentPage: page,
        totalPages,
        totalProducts
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
  
}

module.exports = new ProductService();


