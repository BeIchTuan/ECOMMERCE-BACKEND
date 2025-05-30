const mongoose = require("mongoose");
//const Address = require("./AddressModel");
const Schema = mongoose.Schema;

const addressSchema = new mongoose.Schema({
  nameOfLocation: { type: String },
  location: { type: String },
  phone: { type: String },
});

const userSchema = new Schema(
  {
    email: { type: String },
    password: { type: String },
    name: { type: String, required: false },
    avatar: { type: String },
    birthday: { type: Date },
    gender: { type: String },
    phone: { type: String },
    address: [addressSchema],
    role: {
      type: String,
      enum: ["user", "seller"],
      required: true,
      default: "user",
    },
    rating: { type: Number },
    access_token: { type: String, require: true },
    refresh_token: { type: String, require: true },
    cart: { type: Schema.Types.ObjectId, ref: 'Cart' },
    favoriteProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    fcmTokens: [{
      type: String
    }],

    // Fields specific to sellers
    shopName: {
      type: String,
      required: function () {
        return this.role === "seller";
      },
    },
    shopDescription: {
      type: String,
      required: function () {
        return this.role === "seller";
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
