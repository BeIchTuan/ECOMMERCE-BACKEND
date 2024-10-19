const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const addressSchema = new Schema({
    nameOfLocation: { type: String },
    location: { type: String },
    phone: { type: String}
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
