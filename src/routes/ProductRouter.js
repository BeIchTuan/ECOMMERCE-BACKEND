const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

//Create new product
router.post('/seller/products', authMiddleware(['seller']),productController.createProduct);
//Update product
router.put('/seller/products/:id', authMiddleware(['seller']),productController.updateProduct);
//Delete products
router.delete('/seller/products/:id', authMiddleware(['seller']),productController.deleteProduct);
//Get all shop's product with seller ID
router.get('/seller/products/:sellerId', productController.getAllShopProduct); 
//Get product details
router.get('/products/:id', productController.getProductDetails);

module.exports = router