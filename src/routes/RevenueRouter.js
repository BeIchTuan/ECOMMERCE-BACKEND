const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/RevenueController');
const { authMiddleware } = require('../middlewares/authMiddleware'); // Giả định middleware tồn tại

router.get('/revenue', authMiddleware(['seller']), revenueController.getRevenueReport);
router.get('/revenue/chart', authMiddleware(['seller']), revenueController.getRevenueChart);

module.exports = router;
