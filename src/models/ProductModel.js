const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const skuSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    classifications: [{
      type: String
    }]
  });

const productSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    SKU: [skuSchema],
    price: { type: Number, required: true },
    category: [{ type: Schema.Types.ObjectId, ref: 'Categories' }],
    inStock: { type: Number, required: true },
    image: [{ type: String }],
    discount: { type: Schema.Types.ObjectId, ref: 'Discount' },
    rates: [{ type: Schema.Types.ObjectId, ref: 'Rate' }],
    rate: { type: Number, default: 0 } 
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
