const express = require('express')
const router = express.Router()
const productController = require('../controllers/ProductController')
const { authMiddleware } = require('../middlewares/authMiddleware');

//Search products
router.get('/products/search', productController.searchProducts);
//Create new product
router.post('/seller/products', authMiddleware(['seller']),productController.createProduct);
//Update product
router.put('/seller/products/:id', authMiddleware(['seller']),productController.updateProduct);
//Delete products
router.delete('/seller/products/:id', authMiddleware(['seller']),productController.deleteProduct);
//Get all shop's product with seller ID
router.get('/seller/products/:id', productController.getAllShopProduct); 
//Get product details
router.get('/products/:id',authMiddleware(['user','seller']), productController.getProductDetails);
//Get recommended products for user
router.get('/user/products/:id', authMiddleware(['user']), productController.getRecommendedProducts);


module.exports = router