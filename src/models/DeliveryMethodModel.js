const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for DeliveryMethod
const deliveryMethodSchema = new Schema(
  {
    id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
  },
  { collection: "DeliveryMethod" }
);

// Models
const DeliveryMethod = mongoose.model("DeliveryMethod", deliveryMethodSchema);

module.exports = DeliveryMethod;
