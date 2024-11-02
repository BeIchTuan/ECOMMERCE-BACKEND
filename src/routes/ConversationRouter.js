const express = require('express')
const router = express.Router()
const ConversationController = require('../controllers/ConversationController')

router.post('/conversation', ConversationController.createConversation); //get all scategories

module.exports = router
