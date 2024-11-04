const express = require('express');
const router = express.Router();
const discountController = require('../controllers/DiscountController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/seller/discounts', authMiddleware(['seller']), discountController.createDiscount);
router.get('/seller/discounts', discountController.getAllDiscounts);
//router.get('/:id', discountController.getDiscountById);
router.put('/seller/discounts/:discountId', discountController.updateDiscount);
router.delete('/seller/discounts/:discountId', discountController.deleteDiscount);

module.exports = router;
