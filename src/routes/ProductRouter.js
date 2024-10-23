const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/products', authMiddleware(['seller']),productController.createProduct);
router.put('/products/:id', authMiddleware(['seller']),productController.updateProduct);
router.delete('/products/:id', authMiddleware(['seller']),productController.deleteProduct);
router.get('/products/:sellerId', authMiddleware(['seller', 'user']),productController.getAllShopProduct);

module.exports = router