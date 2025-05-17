const express = require('express');
const LivestreamController = require('../controllers/LivestreamController');
const { authMiddleware} = require('../middlewares/authMiddleware');
const router = express.Router();

// Public routes
router.get('/livestreams', LivestreamController.getLivestreams);

// Seller only routes - single middleware usage
router.post('/livestreams', authMiddleware(["seller"]), LivestreamController.createLivestream);
router.post('/livestreams/:id/start', authMiddleware(["seller"]), LivestreamController.startLivestream);
router.patch('/livestreams/:id/end', authMiddleware(["seller"]), LivestreamController.endLivestream);

module.exports = router;
