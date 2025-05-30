const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const livestreamSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    streamer: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      required: true 
    },
    products: [{
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }],
    pinnedProduct: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled'
    },
    viewers: {
      type: Number,
      default: 0
    },
    startTime: Date,
    endTime: Date,
    streamUrl: String,
    chatEnabled: {
      type: Boolean,
      default: true
    },
    thumbnail: String
  },
  {
    timestamps: true
  }
);

const Livestream = mongoose.model("Livestream", livestreamSchema);
module.exports = Livestream;