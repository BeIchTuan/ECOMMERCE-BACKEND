const express = require('express')
const router = express.Router()
const CartController = require('../controllers/CartController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/cart/:userID', authMiddleware(['user']), CartController.getCart); //get cart

module.exports = router
