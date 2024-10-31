const CartService = require("../services/CartService");

class CartController {
  async getCart(req, res) {
    try {
      const userId = req.id; // Lấy userId từ middleware đã xác thực
      const cartData = await CartService.getCart(userId);

      res.json({
        status: "success",
        ...cartData,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve cart items" });
    }
  }

  async replaceCart(req, res) {
    try {
      const userId = req.id; // Assuming user is authenticated
      const cartBody = req.body;

      const cart = await CartService.replaceCart(userId, cartBody);

      res.status(200).json({
        status: "success",
        message: "Cart updated",
        cart: cart,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: "Failed to update cart item quantity",
        error: error.message,
      });
    }
  }
}

module.exports = new CartController();
