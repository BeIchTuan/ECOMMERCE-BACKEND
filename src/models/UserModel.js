const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: false },
    avatar: { type: String },
    birthday: { type: Date },
    gender: { type: String },
    phone: { type: String },
    //address: [{ type: Schema.Types.ObjectId, ref: 'Address' }],
    role: {
        type: String,
        enum: ['user', 'seller'],
        required: true,
        default: 'user'
    },
    rating: { type: Number },
    access_token: { type: String, require: true },
    refresh_token: { type: String, require: true },
    //cart: { type: Schema.Types.ObjectId, ref: 'Cart' },
    //favoriteProducts: [{ type: Schema.Types.ObjectId, ref: 'Product' }]

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
    address: {
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
