const express = require('express')
const router = express.Router()
const rateController = require('../controllers/RateController')
const { authMiddleware } = require('../middlewares/authMiddleware');

//For customer
//Rate product
router.post('/products/:productId/:orderId/rate', authMiddleware(['user']), rateController.createRate)
//update review
router.put('/rate/:reviewId', authMiddleware(['user']), rateController.updateRate)
//delete rate
router.delete('/rate/:reviewId', authMiddleware(['user']), rateController.deleteRate)

//For seller
//Get all reviews for a products
router.get('/products/:productId/rate', authMiddleware(['seller']), rateController.getRatesByProduct)
//Delete reviews
router.delete('/seller/reviews/:reviewId', authMiddleware(['seller']), rateController.deleteComment)
//reply reviews
router.post('/seller/reviews/:reviewId/reply', authMiddleware(['seller']), rateController.replyToRate)
//update reply
router.put('/seller/reviews/:reviewId/reply', authMiddleware(['seller']), rateController.updateReply)
//get reviews from customers
router.get('/seller/reviews', authMiddleware(['seller']), rateController.getReviews)

module.exports = router