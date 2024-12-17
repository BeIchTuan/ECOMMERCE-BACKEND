const express = require('express')
const router = express.Router()
const CartController = require('../controllers/CartController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/cart', authMiddleware(['user']), CartController.getCart); //get cart
router.post('/cart', authMiddleware(['user']), CartController.addToCart); //add new product to cart
router.delete('/cart/selected', authMiddleware(['user']), CartController.removeSelectedItems); //delete all selected item in cart
router.patch('/cart/select-all', authMiddleware(['user']), CartController.selectAll); //select all items in cart
router.patch('/cart/unselect-all', authMiddleware(['user']), CartController.unselectAll); //unselect all items in cart
router.delete('/cart/:cartItemId', authMiddleware(['user']), CartController.removeFromCart); //delete 1 item in cart
router.patch('/cart/:cartItemId', authMiddleware(['user']), CartController.updateCartItemQuantity); //update quantity 
router.patch('/cart/:cartItemId/select', authMiddleware(['user']), CartController.selectCartItem); //get cart

module.exports = router
