const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/seller/products', authMiddleware(['seller']),productController.createProduct);
router.put('/seller/products/:id', authMiddleware(['seller']),productController.updateProduct);
router.delete('/seller/products/:id', authMiddleware(['seller']),productController.deleteProduct);
router.get('/seller/products/:sellerId', productController.getAllShopProduct);

module.exports = router