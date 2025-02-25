const redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

const redisClient = redis.createClient({
  url: "redis://localhost:6379", 
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

redisClient.connect()
  .then(() => console.log("✅ Redis connected successfully!"))
  .catch(console.error);

module.exports = redisClient;
