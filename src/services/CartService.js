const { Cart, CartItem } = require("../models/CartModel");
// const Product = require("../models/ProductModel");
// const User = require("../models/UserModel");

class CartService {
  async getCart(userId) {
    try {
      const cart = await Cart.findOne({ user: userId }).populate({
        path: "cartItem",
        populate: {
          path: "product",
          model: "Product",
          populate: {
            path: "seller",
            model: "User",
            select: "shopName",
          },
        },
      });

      if (!cart) {
        return {
          totalAmount: 0,
          totalSelectedAmount: null,
          products: [],
        };
      }

      let totalAmount = 0;
      const products = cart.cartItem
        .map((item) => {
          const product = item.product;

          // Kiểm tra nếu `product` hoặc `seller` là null
          if (!product) {
            return null;
          }
          if (!product.seller) {
            return null;
          }

          const discount = (product.price * (product.salePercent || 0)) / 100;
          const finalPrice =
            product.priceAfterSale !== undefined
              ? product.priceAfterSale
              : product.price - discount;
          const totalPrice = finalPrice * item.quantity;
          totalAmount += totalPrice;

          return {
            cartItemId: item._id.toString(),
            isSelected: item.isSelected,
            id: product._id.toString(),
            name: product.name,
            shopInfo: {
              id: product.seller._id.toString(),
              name: product.seller.shopName,
            },
            price: product.price,
            totalPrice,
            isDiscount: !!product.salePercent,
            discount,
            inStock: product.inStock,
            thumbnail: product.thumbnail,
            quantity: item.quantity,
            SKU: item.SKU.map((sku) => ({
              name: sku.name,
              classifications: sku.classifications,
              selected: sku.selected,
            })),
          };
        })
        .filter((item) => item !== null); // Lọc bỏ các mục null

      return {
        totalAmount,
        totalSelectedAmount: null,
        products,
      };
    } catch (error) {
      console.error("Error in getCart:", error.message);
      throw new Error(error.message);
    }
  }

  async replaceCart(userId, cartBody) {
    try {
      // Kiểm tra nếu `products` không phải là một mảng, báo lỗi ngay lập tức
      if (!Array.isArray(cartBody.products)) {
        throw new Error(
          "Invalid cart body format: 'products' should be an array."
        );
      }

      // Tìm giỏ hàng của người dùng dựa trên userId
      let cart = await Cart.findOne({ user: userId });

      // Nếu giỏ hàng chưa tồn tại, tạo mới một giỏ hàng cho user
      if (!cart) {
        cart = new Cart({ user: userId, cartItem: [] });
      } else {
        // Nếu giỏ hàng đã tồn tại, xóa các mục hiện có trong giỏ hàng
        await CartItem.deleteMany({ _id: { $in: cart.cartItem } });
        cart.cartItem = [];
      }

      // Duyệt qua từng sản phẩm trong `products` từ FE gửi đến
      for (const product of cartBody.products) {
        const skuData = product.SKU.map((sku) => ({
          name: sku.name,
          classifications: sku.classifications,
          selected: sku.selected,
        }));

        const cartItem = new CartItem({
          product: product.id,
          quantity: product.quantity,
          SKU: skuData,
          isSelected: product.isSelected || false,
        });

        // Lưu CartItem vào database
        await cartItem.save();

        // Thêm CartItem mới vào giỏ hàng
        cart.cartItem.push(cartItem._id);
      }

      // Lưu giỏ hàng cập nhật
      await cart.save();

      return cart;
    } catch (error) {
      throw Error(error.message);
    }
  }
}

module.exports = new CartService();
