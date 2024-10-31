const { Cart, CartItem } = require("../models/CartModel");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");

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

      console.log("Cart after populate:", cart);

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
            console.warn(`Product not found for cartItemId: ${item._id}`);
            return null;
          }
          if (!product.seller) {
            console.warn(`Seller not found for productId: ${product._id}`);
            return null;
          }

          const discount = product.discount ? 0.1 * product.price : 0;
          const totalPrice = (product.price - discount) * item.quantity;
          totalAmount += totalPrice;

          return {
            cartItemId: item._id.toString(),
            isSelected: false,
            id: product._id.toString(),
            name: product.name,
            shopInfo: {
              id: product.seller._id.toString(),
              name: product.seller.shopName,
            },
            price: product.price,
            totalPrice,
            isDiscount: !!product.discount,
            discount,
            inStock: product.inStock,
            thumbnail: product.thumbnail,
            quantity: item.quantity,
            SKU: product.SKU.map((sku) => ({
              name: sku.name,
              classifications: sku.classifications,
              selected: null,
            })),
          };
        })
        .filter((item) => item !== null); // Lọc bỏ các mục null

      console.log("Processed products:", products);

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
    // Check if cartBody.products is an array
    if (!Array.isArray(cartBody.products)) {
      throw new Error(
        "Invalid cart body format: 'products' should be an array."
      );
    }

    // Find or create a cart for the user
    let cart = await Cart.findOne({ user: userId }).populate("cartItem");

    if (!cart) {
      cart = new Cart({ user: userId, cartItem: [] });
    }

    // Process each product in the products array
    for (const product of cartBody.products) {
      let cartItem;

      // Check if cartItemId is valid before finding
      if (product.cartItemId) {
        cartItem = await CartItem.findById(product.cartItemId);
      }

      // If the item exists, update it; otherwise, create a new one
      if (cartItem) {
        cartItem.quantity = product.quantity;
      } else {
        // Create a new cart item if it doesn't exist or cartItemId was invalid
        cartItem = new CartItem({
          product: product.id,
          quantity: product.quantity,
        });
        cart.cartItem.push(cartItem._id);
      }

      await cartItem.save();
    }

    await cart.save();
    return cart;
  }

  // Update quantity of a product in the cart

  // Remove a product from the cart
  async removeFromCart(cartItemId) {
    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) throw new Error("Cart item not found");

    await CartItem.findByIdAndRemove(cartItemId);
    await Cart.updateOne({}, { $pull: { cartItem: cartItemId } });
    return cartItemId;
  }
}

module.exports = new CartService();
