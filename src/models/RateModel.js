const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rateSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Người đánh giá
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true }, // Sản phẩm được đánh giá
    star: { type: Number, default: 0, min: 0, max: 5 }, // Số sao, với giới hạn từ 0 đến 5
    comment: { type: String, default: "" }, // Nội dung đánh giá
    reply: { type: String, default: "" }, // Phản hồi từ người bán
    createdAt: { type: Date, default: Date.now }, // Ngày tạo đánh giá
});

module.exports = mongoose.model('Rate', rateSchema);
