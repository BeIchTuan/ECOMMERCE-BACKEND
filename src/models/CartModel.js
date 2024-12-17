const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Định nghĩa schema Cart với cartItems có _id tự động
const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Reference to User
  cartItems: [
    {
      _id: { type: Schema.Types.ObjectId, auto: true }, // Tự động tạo _id cho mỗi cartItem
      product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true },
      SKU: [
        {
          name: String,
          classifications: [String],
          selected: String,
        },
      ],
      isSelected: { type: Boolean, default: false },
    },
  ],
});

// Định nghĩa model Cart
const Cart = mongoose.model("Cart", cartSchema);

// Export model Cart
module.exports = { Cart };
