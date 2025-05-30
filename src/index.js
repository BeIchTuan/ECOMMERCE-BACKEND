const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const routes = require('./routes');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require("cors");

// HTTP & WebSocket servers
const http = require('http');
const { Server: WebSocketServer } = require('ws');
const { Server: SocketIOServer } = require('socket.io');
const websocketServer = require('./websocketServer');
const signalingServer = require('./signalingServer');

dotenv.config();
app.use(morgan('combined'));
app.use(cookieParser());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });
websocketServer(wss);

// Initialize Socket.IO server for livestream
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  connectTimeout: 60000,
  allowEIO3: true, // Enable Engine.IO v3 compatibility
  transports: ['websocket', 'polling']
});

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

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
    credentials: true,
  })
);

const port = process.env.PORT || 3001;
const wsPort = process.env.WS_PORT || 8081;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Hello world!');
});

routes(app);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Mongoose connected to MongoDB');
    server.listen(port, () => {
      console.log(`App listening on port ${port}`);
    });
    
    // Start signaling server on port 8081
    signalingServer.listen(wsPort, () => {
      console.log(`Signaling WebSocket server is listening on port ${wsPort}`);
    });
  })
  .catch(err => {
    console.error('Mongoose connection error:', err);
  });

