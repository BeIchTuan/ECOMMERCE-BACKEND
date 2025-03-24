const redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://redis:6379",
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

redisClient.connect()
  .then(() => console.log("✅ Redis connected successfully!"))
  .catch(console.error);

module.exports = redisClient;