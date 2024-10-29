const CartService = require('../services/CartService');

class CartController {
    async getCart(req, res) {
        try {
            const userId = req.id; // Assuming user ID is attached to the request, e.g., from authentication middleware
            const cartData = await CartService.getCart(userId);
    
            return res.status(200).json(cartData);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ status: 'error', message: 'Unable to retrieve cart.' });
        }
    }
}


module.exports = new CartController();
