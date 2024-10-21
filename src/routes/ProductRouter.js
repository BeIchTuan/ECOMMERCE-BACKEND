const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/products', authMiddleware(['seller']),productController.createProduct);
router.put('/products/:id', authMiddleware(['seller']),productController.updateProduct);
router.delete('/products/:id', authMiddleware(['seller']),productController.deleteProduct);

module.exports = router