const Category = require("../models/CategoriesModel");

class CategoryService {
    async getCategories() {
        try {
          return await Category.find();
        } catch (error) {
          throw new Error(error.message);
        }
      }
}

module.exports = new CategoryService()