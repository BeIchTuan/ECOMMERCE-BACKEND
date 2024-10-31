const express = require('express')
const router = express.Router()
const CartController = require('../controllers/CartController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/cart', authMiddleware(['user']), CartController.getCart); //get cart
router.post('/cart', authMiddleware(['user']), CartController.replaceCart); //add cart

module.exports = router
