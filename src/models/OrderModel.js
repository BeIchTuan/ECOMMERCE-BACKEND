const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // reference to seller/shop
});

const addressSchema = new Schema({
  nameOfLocation: { type: String, required: true },
  location: { type: String, required: true },
  phone: { type: String, required: true },
});

const orderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [orderItemSchema],
  address: addressSchema,
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  shippingCost: { type: Number, required: true },
  deliveryStatus: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
