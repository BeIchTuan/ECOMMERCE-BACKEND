const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccount.json"); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function generateToken(uid) {
  try {
    const token = await admin.auth().createCustomToken(uid);
    console.log("Custom Token:", token);
  } catch (error) {
    console.error("Error generating token:", error);
  }
}

generateToken("test-user-id");

module.exports = admin;
