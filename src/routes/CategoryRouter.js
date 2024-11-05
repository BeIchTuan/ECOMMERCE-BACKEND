const express = require('express')
const router = express.Router()
const CategoryController = require('../controllers/CategoryController')

router.get('/categories', CategoryController.getCategories); //get all categories

module.exports = router
