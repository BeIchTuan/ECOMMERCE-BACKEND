const dotenv = require("dotenv");

dotenv.config();

const momoConfig = {
  PARTNER_CODE: "MOMO",
  ACCESS_KEY: process.env.MOMO_ACCESS_KEY,
  SECRET_KEY: process.env.MOMO_SECRET_KEY,
  API_ENDPOINT: process.env.MOMO_API_ENDPOINT,
  REDIRECT_URL: process.env.MOMO_REDIRECT_URL,
  IPN_URL: process.env.MOMO_IPN_URL,
};

module.exports = momoConfig;
