const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
// const { MongoClient } = require('mongodb');
const routes = require('./routes');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require("cors");

//Websocket
const http = require('http')
const { Server } = require('ws');
const websocketServer = require('./websocketServer');

dotenv.config();
app.use(morgan('combined'));

app.use(cookieParser());

const server = http.createServer(app);
// Khởi tạo WebSocket server và tích hợp với server HTTP
const wss = new Server({ server });
websocketServer(wss); // Truyền WebSocket server vào file websocketServer.js

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

// Sử dụng middleware cors
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Cho phép gửi cookie
  })
);

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
    server.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
  })
  .catch(err => {
    console.error('Mongoose connection error:', err);
  });

