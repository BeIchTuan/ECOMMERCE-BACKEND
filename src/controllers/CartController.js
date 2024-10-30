const CartService = require("../services/CartService");

class CartController {
  async getCart(req, res) {
    try {
      const userId = req.id; // Assuming user ID is attached to the request, e.g., from authentication middleware
      const cartData = await CartService.getCart(userId);

      return res.status(200).json(cartData);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ status: "error", message: "Unable to retrieve cart." });
    }
  }

  async replaceCart(req, res) {
    try {
      const userId = req.id; // Assuming user is authenticated
      const cartBody = req.body;

      const cart = await CartService.replaceCart(userId, cartBody);

      res.status(200).json({
        status: "success",
        message: "Product added to cart",
        //cart: cart,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: "Failed to update cart item quantity",
        error: error.message,
      });
    }
  }

  async updateQuantity(req, res) {
    try {
      const { cartItemId } = req.params;
      const { quantity } = req.body;
      const updatedItem = await CartService.updateQuantity(
        cartItemId,
        quantity
      );
      res.status(200).json({
        status: "success",
        message: "Cart item quantity updated",
        updatedItem,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateProductSKU(req, res) {
    try {
      const { cartItemId } = req.params;
      const { skuId } = req.body;
      const updatedItem = await cartService.updateProductSKU(cartItemId, skuId);
      res.status(200).json(updatedItem);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeFromCart(req, res) {
    try {
      const { cartItemId } = req.params;
      const removedItem = await cartService.removeFromCart(cartItemId);
      res.status(200).json({ message: "Item removed", removedItem });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new CartController();
