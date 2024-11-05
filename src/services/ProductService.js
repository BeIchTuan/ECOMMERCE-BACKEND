const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const Discount = require("../models/DiscountModel");
const Rate = require("../models/RateModel");

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
  async getProductDetails(productId, userId) {
    try {
      const product = await Product.findById(productId)
        .populate("category", "name")
        .populate({
          path: "seller",
          select: "shopName _id",
        })
        .populate({
          path: "discount",
          select: "discountInPercent",
        })
        .populate({
          path: "rates",
          select: "user star comment reply createdAt",
          populate: { path: "user", select: "avatar name" },
        })
        .lean();

      if (!product) throw new Error("Product not found");

      const user = await User.findById(userId).select("favoriteProducts");
      const favoriteProductIds = user
        ? user.favoriteProducts.map((prod) => prod.toString())
        : [];
      const isFavorite = favoriteProductIds.includes(product._id.toString());

      const reviews = (product.rates || []).map((rate) => {
        return {
          id: rate._id,
          avatarSrc: rate.user?.avatar || "",
          name: rate.user?.name || "Anonymous",
          date: rate.createdAt.toISOString().split("T")[0],
          stars: rate.star,
          comment: rate.comment || "", // Chắc chắn rằng comment là một chuỗi
          reply: rate.reply || "",
        };
      });

      const productDetails = {
        id: product._id,
        isFavorite,
        name: product.name,
        description: product.description,
        price: product.price,
        salePercent: product.salePercent,
        priceAfterSale: product.priceAfterSale,
        inStock: product.inStock,
        sold: product.sold,
        shopInfo: {
          shopId: product.seller._id,
          shopName: product.seller.shopName,
        },
        category: (product.category || []).map((cat) => ({
          id: cat._id,
          name: cat.name,
        })),
        sku: (product.SKU || []).map((skuItem) => ({
          name: skuItem.name,
          classification: skuItem.classifications,
        })),
        discount: product.discount ? product.discount.discountInPercent : 0,
        averageStar: product.averageStar,
        reviews,
        images: product.image,
      };

      return productDetails;
    } catch (error) {
      console.error("Error in getProductDetails:", error.message);
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

      if (data.salePercent !== undefined) {
        const discount = (data.salePercent / 100) * product.price;
        product.priceAfterSale =
          Math.round((product.price - discount) * 100) / 100;
      }

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
  async getAllShopProducts(sellerId, page = 1, itemsPerPage = 15) {
    try {
      // Calculate skip and limit for pagination
      const skip = (page - 1) * itemsPerPage;

      // Get the total count of products for this seller
      const totalItems = await Product.countDocuments({ seller: sellerId });

      // Fetch products with pagination and populate category name
      const products = await Product.find({ seller: sellerId })
        .populate("category", "name")
        .skip(skip)
        .limit(itemsPerPage);

      // If no products are found, throw an error
      if (products.length === 0) {
        throw new Error("No products found for this shop");
      }

      // Calculate total pages
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      return {
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          itemsPerPage: itemsPerPage,
          totalItems: totalItems,
        },
        products: products,
      };
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
      const products = await Product.find()
        .skip(skip)
        .limit(itemsPerPage)
        .populate("seller", "shopName"); // .populate('product', 'name'); // Populate with product name

      const user = await User.findById(userId).select("favoriteProducts");

      const favoriteProductIds = user
        ? user.favoriteProducts.map((prod) => prod.toString())
        : [];

      // Count total products to calculate total pages
      const totalItems = await Product.countDocuments();
      const totalPages = Math.ceil(totalItems / itemsPerPage);

      const formattedProducts = products.map((product) => {
        const productObj = product.toObject(); // Chuyển product thành đối tượng JavaScript thuần
        const shopInfor = product.seller
          ? {
              shopId: product.seller._id,
              shopName: product.seller.shopName,
            }
          : null;

        const isFavorite = favoriteProductIds.includes(product._id.toString()); // Kiểm tra sản phẩm có trong danh sách yêu thích không

        delete productObj.seller; // Xóa trường seller khỏi product

        return { ...productObj, shopInfor, isFavorite }; // Thêm shopInfo và isFavourite vào phản hồi
      });

      return {
        products: formattedProducts,
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
        salePercent: product.salePercent,
        priceAfterSale: product.priceAfterSale,
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
