const CategoryService = require("../services/CategoryService");

class CategoryController{
    async getCategories(req, res) {
        try {    
          const product = await CategoryService.getCategories();
          return res.status(200).json({
            status: 'success',
            message: "Get categories successfully",
            categories: product
          });
        } catch (error) {
          return res.status(400).json({
            status: 'error',
            message: error.message
          });
        }
      };
}

module.exports = new CategoryController();
