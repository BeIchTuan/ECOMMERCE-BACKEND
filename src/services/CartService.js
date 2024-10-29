const {Cart, CartItem} = require("../models/CartModel");

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
}

module.exports = new CartService();
