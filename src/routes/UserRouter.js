const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')

router.post('/auth/register', userController.createUser)
router.post('/auth/login', userController.loginUser)
router.put('/update-user/:id', userController.updateUser)

module.exports = router