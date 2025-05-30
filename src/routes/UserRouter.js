const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')
const { authMiddleware } = require('../middlewares/authMiddleware');
const upload = require("../middlewares/uploadImage");
const FCMTokenController = require('../controllers/FCMTokenController')

//Work with user information
router.post('/auth/register', userController.sendOTP)
router.post('/auth/confirm-otp', userController.verifyOTP)
router.post('/auth/login', userController.loginUser)
router.post('/auth/google', userController.loginGoogle)
router.put("/forget-password", userController.resetPassword);
router.post('/fcm-token', authMiddleware(), FCMTokenController.saveToken);
router.delete('/fcm-token', authMiddleware(), FCMTokenController.deleteToken);

router.put('/user/:id', upload.single("avatar"), authMiddleware(['user', 'seller']), userController.updateUser)
router.delete('/user/:id', userController.deleteUser)
router.get('/user/:id', userController.getUser)

//Favourite products for customer
router.post('/favorites/:productId', authMiddleware(['user']), userController.addFavouriteProduct)
router.delete('/favorites/:productId', authMiddleware(['user']), userController.deleteFavoriteProduct)
router.get('/favorites', authMiddleware(['user']), userController.getFavoriteProducts)

//Seller
router.get('/seller/customers', authMiddleware(['seller']), userController.getCustomerInfors)
router.get('/seller/customers/:customerId/orders', authMiddleware(['seller']), userController.getOrderCustomerHistory)

module.exports = router