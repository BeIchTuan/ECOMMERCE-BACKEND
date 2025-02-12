const Product = require("../models/ProductModel");
const User = require("../models/UserModel");
const Discount = require("../models/DiscountModel");
const Rate = require("../models/RateModel");
const Order = require("../models/OrderModel");
const Cart = require("../models/CartModel");
const axios = require("axios");

const {
  deleteFromCloudinary,
  extractPublicId,
} = require("../utils/uploadImage");

class ProductService {
  // Tạo sản phẩm mới
  async createProduct(data, sellerId) {
    try {
      const newProduct = new Product({
        ...data,
        seller: sellerId,
      });

      if (data.salePercent !== undefined) {
        const discount = (data.salePercent / 100) * newProduct.price;
        newProduct.priceAfterSale =
          Math.round((newProduct.price - discount) * 100) / 100;
      }

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
        salePercent: product.salePercent || 0,
        priceAfterSale: product.priceAfterSale || product.price,
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
        SKU: (product.SKU || []).map((skuItem) => ({
          name: skuItem.name,
          classifications: skuItem.classifications,
        })),
        //discount: product.discount ? product.discount.discountInPercent : 0,
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
  async updateProduct(productId, sellerId, data, newImages, imagesToDelete) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      if (product.seller.toString() !== sellerId) {
        throw new Error("You are not authorized to update this product");
      }

      if (imagesToDelete && imagesToDelete.length > 0) {
        if (typeof imagesToDelete === "string") {
          imagesToDelete = JSON.parse(imagesToDelete);
        }

        for (const image of imagesToDelete) {
          if (typeof image === "string") {
            const publicId = extractPublicId(image);
            console.log("Extracted Public ID:", publicId);

            await deleteFromCloudinary(publicId);

            const index = product.image.indexOf(image);
            if (index > -1) product.image.splice(index, 1);
          } else {
            console.error("Invalid image URL:", image);
          }
        }
      }

      // Thêm ảnh mới vào danh sách ảnh
      if (newImages && newImages.length > 0) {
        product.image.push(...newImages);
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

      if (product.image && product.image.length > 0) {
        if (typeof product.image === "string") {
          product.image = JSON.parse(product.image);
        }

        for (const image of product.image) {
          if (typeof image === "string") {
            const publicId = extractPublicId(image);
            console.log("Extracted Public ID:", publicId);

            await deleteFromCloudinary(publicId);

            const index = product.image.indexOf(image);
            if (index > -1) product.image.splice(index, 1);
          } else {
            console.error("Invalid image URL:", image);
          }
        }
      }

      // Xóa sản phẩm
      return await Product.deleteOne({ _id: productId });
    } catch (error) {
      throw new Error("Error deleting product: " + error.message);
    }
  }

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

  async searchProducts({
    userId,
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
  }) {
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

      // Lọc theo khoảng giá
      if (minPrice || maxPrice) {
        query.priceAfterSale = {};
        if (minPrice) query.priceAfterSale.$gte = Number(minPrice);
        if (maxPrice) query.priceAfterSale.$lte = Number(maxPrice);
      }

      // Lọc theo đánh giá sao
      if (stars) {
        const starsArray = stars.split(",").map(Number);
        query.averageStar = { $in: starsArray };
      }

      // Lọc theo nơi bán (shopAddress)
      //   if (shopAddress) {
      //     query.location = { $regex: shopAddress, $options: "i" };
      // }

      // Lọc sản phẩm có giảm giá
      if (discount === "true") {
        query.salePercent = { $gt: 0 };
      }

      // Xây dựng sắp xếp
      const sortOptions = {
        "price-asc": { priceAfterSale: 1 },
        "price-desc": { priceAfterSale: -1 },
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        "best-seller": { sold: -1 },
      };
      const sort = sortOptions[filter] || {};

      // Tính toán skip và limit
      const skip = (page - 1) * itemsPerPage;

      // Tìm kiếm sản phẩm với phân trang
      const products = await Product.find(query)
        .skip(skip)
        .limit(itemsPerPage)
        .sort(sort)
        .populate("seller", "shopName"); // .populate('product', 'name'); // Populate with product name

      const user = await User.findById(userId).select("favoriteProducts");

      const favoriteProductIds = user
        ? user.favoriteProducts.map((prod) => prod.toString())
        : [];

      // Count total products to calculate total pages
      const totalItems = await Product.countDocuments(query);
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
          currentPage: parseInt(page, 10),
          totalPages: parseInt(totalPages, 10),
          itemsPerPage: parseInt(itemsPerPage, 10),
          totalItems: parseInt(totalItems, 10),
        },
      };
    } catch (error) {
      throw new Error("Error searching products: " + error.message);
    }
  }

  async getRecommendedProducts(page = 1, itemsPerPage = 15, userId) {
    try {
      const skip = (page - 1) * itemsPerPage;

      let recommendedProducts = [];
      let favoriteProductIds = [];
      let cartProductIds = [];
      let orderProductIds = [];

      let recommendedProductIds;
      let remainingProducts;

      if (userId) {
        const user = await User.findById(userId)
          .select("favoriteProducts cart")
          .populate({
            path: "cart",
            populate: {
              path: "cartItems.product",
              select: "_id",
            },
          });

        favoriteProductIds = Array.isArray(user?.favoriteProducts)
          ? user.favoriteProducts.map((prod) => prod.toString())
          : [];

        cartProductIds = Array.isArray(user?.cart?.cartItems)
          ? user.cart.cartItems.map((item) => item.product._id.toString())
          : [];

        orderProductIds = Array.isArray(user?.order)
          ? user.order.flatMap((order) =>
              order.items.map((item) => item.productId.toString())
            )
          : [];

        if (
          !favoriteProductIds.length &&
          !cartProductIds.length &&
          !orderProductIds.length
        ) {
          // Fetch best-seller products if user has no preferences
          recommendedProducts = await Product.find()
            .sort({ salesCount: -1 })
            .populate("seller", "shopName");
        } else {
          const similarCategoryIds = await Product.distinct("category", {
            _id: {
              $in: [
                ...favoriteProductIds,
                ...cartProductIds,
                ...orderProductIds,
              ],
            },
          });

          recommendedProducts = await Product.find({
            _id: {
              $nin: [
                ...favoriteProductIds,
                ...cartProductIds,
                ...orderProductIds,
              ],
            },
            category: { $in: similarCategoryIds },
          })
            .sort({ salesCount: -1 })
            .populate("seller", "shopName");
        }

        // Exclude recommended product IDs to get remaining products
        recommendedProductIds = recommendedProducts.map((prod) =>
          prod._id.toString()
        );
        remainingProducts = await Product.find({
          _id: { $nin: recommendedProductIds },
        })
          .sort({ createdAt: -1 }) // Optional: sort remaining products by newest
          .populate("seller", "shopName");

        // Merge recommended and remaining products
        //const mergedProducts = [...recommendedProducts, ...remainingProducts];
      } else {
        // If userId is null, return all products sorted by sales count
        recommendedProducts = await Product.find()
          .sort({ salesCount: -1 })
          .populate("seller", "shopName");

        remainingProducts = [];
      }

      // Exclude recommended product IDs to get remaining products
      // recommendedProductIds = recommendedProducts.map((prod) =>
      //   prod._id.toString()
      // );
      // remainingProducts = await Product.find({
      //   _id: { $nin: recommendedProductIds },
      // })
      //   .sort({ createdAt: -1 }) // Optional: sort remaining products by newest
      //   .populate("seller", "shopName");

      // Merge recommended and remaining products
      const mergedProducts = [...recommendedProducts, ...remainingProducts];

      // Paginate merged products
      const totalItems = mergedProducts.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const paginatedProducts = mergedProducts.slice(skip, skip + itemsPerPage);

      // Format products
      const formattedProducts = paginatedProducts.map((product) => {
        const productObj = product.toObject();
        const shopInfor = product.seller
          ? {
              shopId: product.seller._id,
              shopName: product.seller.shopName,
            }
          : null;

        return {
          _id: productObj._id,
          name: productObj.name,
          description: productObj.description,
          SKU: productObj.SKU,
          price: productObj.price,
          category: productObj.category,
          inStock: productObj.inStock,
          image: productObj.image,
          rates: productObj.rates,
          sold: productObj.sold,
          averageStar: productObj.averageStar,
          rateCount: productObj.rateCount,
          priceAfterSale: productObj.priceAfterSale,
          __v: productObj.__v,
          salePercent: productObj.salePercent,
          isDeleted: productObj.isDeleted,
          thumbnail: productObj.thumbnail,
          id: productObj._id,
          shopInfor,
          isFavorite: favoriteProductIds.includes(productObj._id.toString()),
        };
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
}

module.exports = new ProductService();
