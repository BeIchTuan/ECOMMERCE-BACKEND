const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/products', authMiddleware(['seller']),productController.createProduct);

module.exports = router