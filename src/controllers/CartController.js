const CartService = require("../services/CartService");

class CartController {
  async getCart(req, res) {
    try {
      const userId = req.id;
      const cart = await CartService.getCart(userId);
      res.status(200).json(cart);
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async addToCart(req, res) {
    try {
      const userId = req.id;
      const productDetails = req.body;
      console.log(productDetails)
      const response = await CartService.addToCart(userId, productDetails);
      
      res.status(200).json({ status: "success", message: response.message });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async removeFromCart(req, res) {
    try {
      const userId = req.id;
      const cartItemId = req.params.cartItemId;
      const response = await CartService.removeFromCart(userId, cartItemId);
      res.status(200).json({ status: "success", message: response.message });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async updateCartItemQuantity(req, res) {
    try {
      const userId = req.id;
      const cartItemId = req.params.cartItemId;
      const { quantity } = req.body;
      const response = await CartService.updateCartItemQuantity(
        userId,
        cartItemId,
        quantity
      );
      res.status(200).json({ status: "success", message: response.message });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async selectCartItem(req, res) {
    try {
      const userId = req.id;
      const cartItemId = req.params.cartItemId;
      const { isSelected } = req.body;
      const response = await CartService.selectCartItem(
        userId,
        cartItemId,
        isSelected
      );
      res.status(200).json({ status: "success", message: response.message });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async removeSelectedItems(req, res) {
    try {
      const userId = req.id;
      const response = await CartService.removeSelectedItems(userId);
      res.status(200).json({ status: "success", message: response.message });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }

  async selectAll(req, res) {
    try {
      const userId = req.id

      // Call the service method
      const result = await CartService.selectAllItems(userId);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      console.error("Error in selectAll:", error.message);
      res.status(500).json({
        status: 'error',
        message: 'Failed to select all products in the cart',
      });
    }
  }

  async unselectAll(req, res) {
    try {
      const userId = req.id; // Assume userId is passed as a parameter

      // Call the service method
      const result = await CartService.unselectAllItems(userId);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      console.error("Error in unselectAll:", error.message);
      res.status(500).json({
        status: 'error',
        message: 'Failed to unselect all products in the cart',
      });
    }
  }
}

module.exports = new CartController();
