const express = require('express')
const router = express.Router()
const ConversationController = require('../controllers/ConversationController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/conversation', authMiddleware(['user', 'seller']), ConversationController.createConversation); //create new conversation
router.get('/conversation', authMiddleware(['user', 'seller']), ConversationController.getUserConversations); //get conversation

module.exports = router
