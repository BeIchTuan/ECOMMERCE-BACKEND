const express = require('express')
const router = express.Router()
const userController = require('../controllers/UserController')

router.post('/auth/register', userController.createUser)
router.post('/auth/login', userController.loginUser)
router.put('/user/:id', userController.updateUser)
router.delete('/user/:id', userController.deleteUser)
router.get('/user/:id', userController.getUser)

module.exports = router