const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')
const { authMiddleware } = require('../middlewares/authMiddleware');

//Work with user information
router.post('/auth/register', userController.createUser)
router.post('/auth/login', userController.loginUser)
router.put('/user/:id', authMiddleware(['user', 'seller']), userController.updateUser)
router.delete('/user/:id', userController.deleteUser)
router.get('/user/:id', userController.getUser)

//Favourite products
router.post('/favorites/:productId', authMiddleware(['user']), userController.addFavouriteProduct)
router.delete('/favorites/:productId', authMiddleware(['user']), userController.deleteFavoriteProduct)
router.get('/favorites', authMiddleware(['user']), userController.getFavoriteProducts)

module.exports = router