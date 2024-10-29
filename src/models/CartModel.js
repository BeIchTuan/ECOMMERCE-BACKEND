const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Định nghĩa schema CartItem
const cartItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true }
});

// Định nghĩa model CartItem
const CartItem = mongoose.model('CartItem', cartItemSchema);

// Định nghĩa schema Cart
const cartSchema = new Schema({
    cartItem: [{ type: Schema.Types.ObjectId, ref: 'CartItem' }]
});

// Định nghĩa model Cart
const Cart = mongoose.model('Cart', cartSchema);

// Export cả hai model
module.exports = { CartItem, Cart };
