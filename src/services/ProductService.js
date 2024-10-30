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
  async getRecommendedProducts(page = 1, itemsPerPage = 15, userId) {
    // try {
    //   const skip = (page - 1) * itemsPerPage;

    //   // Tìm người dùng và lấy danh sách danh mục yêu thích
    //   const user = await User.findById(userId);
    //   const favoriteProducts = user.favoriteProducts || []; // Giả sử `favoriteProducts` chứa danh sách các ObjectId của danh mục
    //   console.log(user.favoriteProducts)

    //   // Lọc sản phẩm dựa trên danh mục yêu thích của người dùng
    //   const products = await Product.find({ product: { $in: favoriteProducts } })
    //     .skip(skip)
    //     .limit(itemsPerPage)
    //     .populate('product', 'name'); // Lấy tên của product

    //   // Đếm tổng số sản phẩm để tính tổng số trang
    //   const totalItems = await Product.countDocuments({ product: { $in: favoriteProducts } });
    //   const totalPages = Math.ceil(totalItems / itemsPerPage);

    //   return {
    //     products,
    //     pagination: {
    //       currentPage: page,
    //       totalPages,
    //       itemsPerPage,
    //       totalItems
    //     }  
    //   };
    // } catch (error) {
    //   throw new Error(error.message);
    // }
    try {
        const skip = (page - 1) * itemsPerPage;

        // Fetch products from the database without any filtering
        const products = await Product.find()
            .skip(skip)
            .limit(itemsPerPage)
            // .populate('product', 'name'); // Populate with product name

        // Count total products to calculate total pages
        const totalItems = await Product.countDocuments();
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        return {
            products,
            pagination: {
                currentPage: page,
                totalPages,
                itemsPerPage,
                totalItems
            }
        };
    } catch (error) {
        throw new Error(error.message);
    }
  }
  
}

module.exports = new ProductService();


