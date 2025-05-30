const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const User = require('./models/UserModel');
const Livestream = require('./models/LivestreamModel');
const dotenv = require('dotenv');

dotenv.config();

class SignalingServer {
  constructor() {
    this.server = http.createServer();
    this.wss = new WebSocket.Server({ server: this.server });
    this.rooms = new Map(); // Map<streamId, Map<userId, {ws, role, rtcPeerConnection}>>
    this.streams = new Map(); // Map<streamId, MediaStream>
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      try {
        const urlParams = new URL(req.url, 'ws://localhost').searchParams;
        const queryToken = urlParams.get('token');
        const headerToken = req.headers['auth-token'];
        let token = queryToken || headerToken;

        if (!token) {
          throw new Error('Authentication required');
        }

        if (token.startsWith('Bearer ')) {
          token = token.slice(7);
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
        const user = await User.findById(decoded.id);
        if (!user) {
          throw new Error('User not found');
        }

        ws.user = {
          id: user._id.toString(),
          name: user.role === 'seller' ? user.shopName : user.name,
          role: user.role,
          avatar: user.avatar
        };

        console.log(`User connected: ${ws.user.name}`);
        
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'success',
          message: 'Connected to signaling server'
        }));

        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            await this.handleMessage(ws, data);
          } catch (error) {
            console.error('Message handling error:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
        });

        ws.on('close', () => {
          console.log(`User disconnected: ${ws.user?.name}`);
          this.handleDisconnect(ws);
        });

      } catch (error) {
        console.error('WebSocket connection error:', error.message);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
        ws.close();
      }
    });
  }

  async handleMessage(ws, data) {
    const { type, streamId } = data;
    
    switch (type) {
      case 'join-stream':
        await this.handleJoinStream(ws, data);
        break;
      case 'start-streaming':
        await this.handleStartStreaming(ws, data);
        break;
      case 'end-stream':
        await this.handleEndStream(ws, data);
        break;
      case 'offer':
        await this.handleOffer(ws, data);
        break;
      case 'answer':
        await this.handleAnswer(ws, data);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(ws, data);
        break;
      case 'leave-stream':
        await this.handleLeaveStream(ws, data);
        break;
      case 'chat':
        await this.handleChat(ws, data);
        break;
      case 'heart':
        await this.handleHeart(ws, data);
        break;
      default:
        throw new Error('Unknown message type');
    }
  }

  async handleStartStreaming(ws, data) {
    const { streamId } = data;
    console.log(`Starting stream ${streamId}`);
    
    const stream = await Livestream.findById(streamId);
    
    if (!stream || stream.streamer.toString() !== ws.user.id) {
      throw new Error('Unauthorized to start this stream');
    }

    if (!this.rooms.has(streamId)) {
      console.log(`Creating new room for stream ${streamId}`);
      this.rooms.set(streamId, new Map());
    }
    
    const room = this.rooms.get(streamId);
    console.log(`Adding streamer ${ws.user.id} to room ${streamId}`);
    
    room.set(ws.user.id, { 
      ws, 
      role: 'streamer',
      connections: new Map()
    });

    ws.streamId = streamId; // Store streamId in ws for cleanup

    ws.send(JSON.stringify({
      type: 'stream-started',
      streamId,
      role: 'streamer'
    }));

    console.log(`Stream ${streamId} started successfully`);
  }

  async handleJoinStream(ws, data) {
    const { streamId } = data;
    console.log(`Attempting to join stream ${streamId}`);
    
    const stream = await Livestream.findById(streamId)
      .populate('streamer', 'name shopName avatar');
    
    console.log('Stream status:', stream?.status);
    console.log('Active rooms:', Array.from(this.rooms.keys()));
    
    if (!stream || stream.status !== 'live') {
      throw new Error('Stream not found or not live');
    }

    const room = this.rooms.get(streamId);
    if (!room) {
      console.log(`Room not found for stream ${streamId}`);
      throw new Error('Stream room not initialized');
    }

    console.log(`Adding viewer ${ws.user.id} to room ${streamId}`);
    room.set(ws.user.id, { 
      ws, 
      role: 'viewer',
      connections: new Map()
    });

    // Lấy thông tin streamer
    const streamer = Array.from(room.entries())
      .find(([_, client]) => client.role === 'streamer');

    if (streamer) {
      console.log(`Notifying streamer ${streamer[0]} about new viewer`);
      // Thông báo cho streamer về viewer mới
      streamer[1].ws.send(JSON.stringify({
        type: 'viewer-joined',
        viewerId: ws.user.id,
        viewerName: ws.user.name
      }));

      // Gửi thông tin stream cho viewer
      ws.send(JSON.stringify({
        type: 'stream-joined',
        streamId,
        role: 'viewer',
        streamer: {
          id: stream.streamer._id,
          name: stream.streamer.shopName || stream.streamer.name,
          avatar: stream.streamer.avatar
        }
      }));
    } else {
      console.log(`No streamer found in room ${streamId}`);
    }
  }

  async handleOffer(ws, data) {
    const { streamId, targetId, offer } = data;
    const room = this.rooms.get(streamId);
    
    if (room && room.has(targetId)) {
      const target = room.get(targetId);
      target.ws.send(JSON.stringify({
        type: 'offer',
        offer,
        from: ws.user.id
      }));

      // Lưu connection
      const sender = room.get(ws.user.id);
      sender.connections.set(targetId, { state: 'offering' });
    }
  }

  async handleAnswer(ws, data) {
    const { streamId, targetId, answer } = data;
    const room = this.rooms.get(streamId);
    
    if (room && room.has(targetId)) {
      const target = room.get(targetId);
      target.ws.send(JSON.stringify({
        type: 'answer',
        answer,
        from: ws.user.id
      }));

      // Cập nhật trạng thái connection
      const sender = room.get(ws.user.id);
      sender.connections.set(targetId, { state: 'connected' });
    }
  }

  async handleIceCandidate(ws, data) {
    const { streamId, targetId, candidate } = data;
    const room = this.rooms.get(streamId);
    
    if (room && room.has(targetId)) {
      const target = room.get(targetId);
      target.ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate,
        from: ws.user.id
      }));
    }
  }

  async handleLeaveStream(ws, data) {
    const { streamId } = data;
    await this.removeFromRoom(ws, streamId);
  }

  async handleChat(ws, data) {
    const { streamId, message } = data;
    const room = this.rooms.get(streamId);
    
    if (room) {
      room.forEach((client) => {
        client.ws.send(JSON.stringify({
          type: 'chat',
          userId: ws.user.id,
          userName: ws.user.name,
          message,
          timestamp: new Date()
        }));
      });
    }
  }

  async handleHeart(ws, data) {
    const { streamId } = data;
    const room = this.rooms.get(streamId);
    
    if (room) {
      room.forEach((client) => {
        client.ws.send(JSON.stringify({
          type: 'heart',
          userId: ws.user.id,
          userName: ws.user.name
        }));
      });
    }
  }

  async handleDisconnect(ws) {
    this.rooms.forEach((room, streamId) => {
      if (room.has(ws.user.id)) {
        const disconnectingUser = room.get(ws.user.id);
        
        // Đóng tất cả các connections
        disconnectingUser.connections.forEach((conn, targetId) => {
          const target = room.get(targetId);
          if (target) {
            target.ws.send(JSON.stringify({
              type: 'peer-disconnected',
              userId: ws.user.id,
              userName: ws.user.name
            }));
          }
        });

        // Xóa user khỏi room
        room.delete(ws.user.id);

        // Thông báo cho tất cả users còn lại
        room.forEach(client => {
          client.ws.send(JSON.stringify({
            type: 'user-left',
            userId: ws.user.id,
            userName: ws.user.name
          }));
        });

        // Nếu room trống, xóa room
        if (room.size === 0) {
          this.rooms.delete(streamId);
        }
      }
    });
  }

  async removeFromRoom(ws, streamId) {
    const room = this.rooms.get(streamId);
    if (!room) return;

    // Xử lý tương tự như handleDisconnect
    if (room.has(ws.user.id)) {
      const leavingUser = room.get(ws.user.id);
      
      leavingUser.connections.forEach((conn, targetId) => {
        const target = room.get(targetId);
        if (target) {
          target.ws.send(JSON.stringify({
            type: 'peer-left',
            userId: ws.user.id,
            userName: ws.user.name
          }));
        }
      });

      room.delete(ws.user.id);

      room.forEach(client => {
        client.ws.send(JSON.stringify({
          type: 'user-left',
          userId: ws.user.id,
          userName: ws.user.name
        }));
      });

      if (room.size === 0) {
        this.rooms.delete(streamId);
      }
    }
  }

  async handleEndStream(ws, data) {
    const { streamId } = data;
    console.log(`Ending stream ${streamId}`);
    
    const stream = await Livestream.findById(streamId);
    
    if (!stream || stream.streamer.toString() !== ws.user.id) {
      throw new Error('Unauthorized to end this stream');
    }

    const room = this.rooms.get(streamId);
    if (!room) {
      throw new Error('Stream room not found');
    }

    // Thông báo cho tất cả viewers về việc stream kết thúc
    room.forEach((client) => {
        client.ws.send(JSON.stringify({
          type: 'stream-ended',
          streamId,
          message: 'Stream has been ended by the streamer'
        }));
    });

    // // Cập nhật trạng thái stream trong database
    // stream.status = 'ended';
    // stream.endTime = new Date();
    // await stream.save();

    await Livestream.deleteOne({_id: streamId});

    // Đóng tất cả connections và xóa room
    room.forEach((client) => {
      client.connections.forEach((conn) => {
        if (conn.peerConnection) {
          conn.peerConnection.close();
        }
      });
    });

    this.rooms.delete(streamId);

    console.log(`Stream ${streamId} ended successfully`);
  }
  
  listen(port, callback) {
    this.server.listen(port, callback);
  }
}

module.exports = new SignalingServer();
