const express = require('express');
const router = express.Router();
const discountController = require('../controllers/DiscountController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/seller/discounts', authMiddleware(['seller']), discountController.createDiscount);
router.get('/seller/discounts/:sellerId', discountController.getAllDiscounts);
//router.get('/:id', discountController.getDiscountById);
router.put('/seller/discounts/:discountId', authMiddleware(['seller']), discountController.updateDiscount);
router.delete('/seller/discounts/:discountId',authMiddleware(['seller']), discountController.deleteDiscount);

module.exports = router;
