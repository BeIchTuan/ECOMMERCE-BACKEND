const { Cart, CartItem } = require("../models/CartModel");
const Product = require("../models/ProductModel");
const User = require("../models/UserModel");

class CartService {
  async getCart(userId) {
    try {
      // Retrieve the user's cart along with the product and shop details
      const cart = await Cart.findOne({ user: userId }).populate({
        path: "cartItem",
        populate: {
          path: "product",
          select: "name price discount inStock thumbnail SKU seller",
          populate: {
            path: "seller",
            select: "shopName",
          },
        },
      });

      if (!cart) {
        return {
          status: "success",
          totalAmount: 0,
          totalSelectedAmount: null,
          products: [],
        };
      }

      let totalAmount = 0;
      const products = cart.cartItem.map((item) => {
        const product = item.product;
        const isDiscount = !!product.discount;
        const discountValue = isDiscount ? product.discount : 0;
        const price = product.price;
        const totalPrice =
          price * item.quantity - discountValue * item.quantity;

        // Calculate total cart amount
        totalAmount += totalPrice;

        // Format each cart item to match the required structure
        return {
          cartItemId: item._id.toString(),
          isSelected: true, // Assuming all items are selected by default; frontend can change this
          id: product._id.toString(),
          name: product.name,
          seller: {
            id: product.seller._id.toString(),
            name: product.seller.name,
          },
          price: price,
          totalPrice: totalPrice,
          isDiscount: isDiscount,
          discount: discountValue,
          inStock: product.inStock,
          thumbnail: product.thumbnail,
          quantity: item.quantity,
          SKU: product.SKU.map((sku) => ({
            name: sku.name,
            classifications: sku.classifications,
            selected: "", // Placeholder for frontend to handle selected option
          })),
        };
      });

      return {
        status: "success",
        totalAmount: totalAmount,
        totalSelectedAmount: null, // Frontend will calculate this
        products: products,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async replaceCart(userId, cartBody) {
    // Check if cartBody.products is an array
    if (!Array.isArray(cartBody.products)) {
        throw new Error("Invalid cart body format: 'products' should be an array.");
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
