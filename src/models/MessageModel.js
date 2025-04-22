// models/Message.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }], // Danh sách ID sản phẩm liên quan
});

module.exports = mongoose.model('Message', messageSchema);
