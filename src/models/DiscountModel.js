const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const discountSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    discountInPercent: { type: Number, default: 0 },
    minOrderValue: { type: Number },
    maxDiscountValue: { type: Number },
    usageLimit: { type: Number },
    expireDate: { type: Date },
    seller: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

const Discount = mongoose.model("Discount", discountSchema);

module.exports = Discount;