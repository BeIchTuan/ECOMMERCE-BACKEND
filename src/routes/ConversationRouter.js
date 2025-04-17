const express = require('express')
const router = express.Router()
const ConversationController = require('../controllers/ConversationController')
const GeminiController = require('../controllers/GeminiController')
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/conversation', authMiddleware(['user', 'seller']), ConversationController.createConversation); //create new conversation
router.get('/conversation', authMiddleware(['user', 'seller']), ConversationController.getUserConversations); //get conversation

router.post("/chatbot", authMiddleware(['user']), GeminiController.getAnswer);
router.post('/chatbot/consult', authMiddleware(['user']), GeminiController.consultProduct); //ask about product
router.get('/history', authMiddleware(['user']), GeminiController.getChatHistory);

module.exports = router
