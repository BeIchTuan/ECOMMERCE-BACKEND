const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const { MongoClient } = require('mongodb');
const routes = require('./routes');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require("cors");

dotenv.config();
app.use(morgan('combined'));

app.use(cookieParser());

// Sử dụng middleware cors
app.use(cors({
  origin: 'http://localhost:5173/', // Thay bằng URL của frontend
  credentials: true // Cho phép gửi cookie
}));

const port = process.env.PORT || 3001;
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello world!');
});

routes(app);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Mongoose connected to MongoDB');
    // Now, you can safely start your server and perform database operations
    app.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Mongoose connection error:', err);
  });

// async function main() {
//   const uri = process.env.MONGO_URI;

//   // Add useNewUrlParser and useUnifiedTopology options for MongoDB driver
//   const client = new MongoClient(uri);

//   try {
//     console.log('Attempting to connect to MongoDB...');
//     await client.connect();
//     console.log('Successfully connected to MongoDB!');

//     // Make the appropriate DB calls
//     await listDatabases(client);
//   } catch (e) {
//     console.error('Failed to connect to MongoDB:', e.message);
//   } finally {
//     await client.close();
//   }
// }

// main().catch(console.error);

// async function listDatabases(client) {
//   const databasesList = await client.db().admin().listDatabases();
//   console.log('Databases:');
//   databasesList.databases.forEach(db => console.log(` - ${db.name}`));
// }

// app.listen(port, () => {
//   console.log(`App listening on port ${port}`);
// });
