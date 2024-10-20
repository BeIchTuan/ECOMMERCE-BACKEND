const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const skuSchema = new Schema({
    name: { type: String, required: true },
    classifications: [{ type: String }]
});

module.exports = mongoose.model('SKU', skuSchema);
