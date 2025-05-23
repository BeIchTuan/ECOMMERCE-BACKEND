// models/Conversation.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conversationSchema = new Schema(
  {
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // Tham chiếu đến User model
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ["private", "group", "chatbot"],
      default: "private",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
