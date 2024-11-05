const express = require('express')
const router = express.Router()
const ConversationController = require('../controllers/ConversationController')

router.post('/conversation', ConversationController.createConversation); //create new conversation

module.exports = router
