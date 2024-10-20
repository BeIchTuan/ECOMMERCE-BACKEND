const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rateSchema = new Schema({
    star: { type: Number, required: true },
    comment: { type: String },
    reply: { type: String }
});

module.exports = mongoose.model('Rate', rateSchema);
