const Product = require("../models/ProductModel");
const User = require("../models/UserModel");

class ProductService {
  // Tạo sản phẩm mới
  async createProduct(data, sellerId) {
    try {
      const newProduct = new Product({
        ...data,
        seller: sellerId,
      });

      return await newProduct.save();
    } catch (error) {
      throw new Error("Error creating product: " + error.message);
    }
  }

  // Lấy sản phẩm theo ID
  async getProductDetails(productId) {
    try {
      return await Product.findById(productId).populate("category", "name");
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Cập nhật sản phẩm
  async updateProduct(productId, sellerId, data) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      if (product.seller.toString() !== sellerId) {
        throw new Error("You are not authorized to update this product");
      }

      Object.assign(product, data);
      return await product.save();
    } catch (error) {
      throw new Error("Failed to update product: " + error.message);
    }
  }

  // Xóa sản phẩm
  async deleteProduct(productId, sellerId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Kiểm tra xem seller có phải là người sở hữu sản phẩm không
      if (product.seller.toString() !== sellerId) {
        throw new Error("You are not authorized to delete this product");
      }

      // Xóa sản phẩm
      return await Product.deleteOne({ _id: productId });
    } catch (error) {
      throw new Error("Error deleting product: " + error.message);
    }
  }

  // Lấy tất cả sản phẩm của shop
  async getAllShopProducts(sellerId) {
    try {
      // Tìm tất cả sản phẩm của shop dựa trên sellerId
      const products = await Product.find({ seller: sellerId }).populate(
        "category",
        "name"
      );

      if (products.length === 0) {
        throw new Error("No products found for this shop");
      }

      return products;
    } catch (error) {
      throw new Error("Error retrieving products: " + error.message);
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
      const products = await Product.find().skip(skip).limit(itemsPerPage);
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
          totalItems,
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async searchProducts({ name, categoryId, page = 1, itemsPerPage = 15 }) {
    try {
      const query = {};

      // Tìm kiếm theo tên sản phẩm nếu có
      if (name) {
        query.name = { $regex: name, $options: "i" };
      }

      // Lọc theo categoryId nếu có
      if (categoryId) {
        query.category = categoryId;
      }

      // Tính toán skip và limit
      const skip = (page - 1) * itemsPerPage;

      // Tìm kiếm sản phẩm với phân trang
      const products = await Product.find(query)
        .populate({
          path: "category",
          select: "id name",
        })
        .populate({
          path: "seller",
          select: "id shopName",
        })
        .skip(skip)
        .limit(parseInt(itemsPerPage)) // Chuyển `limit` thành số nguyên
        .select("id name description price discount rates image");

      const totalItems = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      // Định dạng dữ liệu trả về
      const formattedProducts = products.map((product) => ({
        id: product._id.toString(),
        name: product.name,
        description: product.description,
        price: product.price,
        shop: product.seller
          ? {
              id: product.seller._id.toString(),
              name: product.seller.shopName,
            }
          : null,
        category: product.category.map((cat) => ({
          id: cat._id.toString(),
          name: cat.name,
        })),
        discount: product.discount ? product.discount._id.toString() : null,
        rates: {
          star: product.rate || 0,
        },
        image: product.thumbnail || "",
      }));

      return {
        formattedProducts,
        pagination: {
          currentPage: page,
          totalPages,
          itemsPerPage,
          totalItems,
        },
      };
    } catch (error) {
      throw new Error("Error searching products: " + error.message);
    }
  }
}

module.exports = new ProductService();
