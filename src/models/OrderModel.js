const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const skuSchema = new Schema({
  selected: { type: String, required: true }, // SKU selected attribute
});

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  SKU: [skuSchema], // Add SKU subdocument
  price: { type: Number, required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // reference to seller/shop
  isRated: { type: Boolean, default: false },
});

const addressSchema = new Schema({
  nameOfLocation: { type: String, required: true },
  location: { type: String, required: true },
  phone: { type: String, required: true },
});

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    address: addressSchema,
    totalPrice: { type: Number, required: true },
    paymentMethod: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    deliveryMethod: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryMethod",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "success"],
      default: "pending",
    },
    shippingCost: { type: Number, required: true },
    deliveryStatus: {
      type: String,
      enum: ["pending", "preparing", "delivering", "delivered", "success"],
      default: "pending",
    },
    paymentData: {
      orderId: { type: String },
      payUrl: { type: String },
      deeplink: { type: String },
      qrCodeUrl: { type: String },
    },
    discount: { type: Schema.Types.ObjectId, ref: "Discount" }, // Thêm discount
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
