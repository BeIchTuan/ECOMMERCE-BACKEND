const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for PaymentMethod
const paymentMethodSchema = new Schema(
  {
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
  },
  { collection: "PaymentMethod" }
);

//Models
const PaymentMethod = mongoose.model("PaymentMethod", paymentMethodSchema);

module.exports = PaymentMethod;
