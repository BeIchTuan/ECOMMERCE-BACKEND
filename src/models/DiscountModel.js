const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const discountSchema = new Schema({
    type: { type: String },
    discountInPercent: { type: Number, default: 0},
    discountAmount: { type: Number }
});

module.exports = mongoose.model('Discount', discountSchema);
