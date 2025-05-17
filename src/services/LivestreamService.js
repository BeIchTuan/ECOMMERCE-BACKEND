const Livestream = require('../models/LivestreamModel');
const User = require('../models/UserModel');

class LivestreamService {
  constructor(io) {
    this.io = io;
    this.activeStreams = new Map(); // Store active stream sessions
    this.streamConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
          urls: 'turn:your-turn-server.com:3478',  // Thay thế bằng TURN server thật
          username: 'username',  // Thay thế bằng credentials thật
          credential: 'password'
        }
      ],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    };
  }

  // Get all active livestreams
  async getAllLivestreams() {
    return await Livestream.find({ status: 'live' })
      .populate('streamer', 'name shopName avatar')
      .populate('products', 'name price images');
  }

  // Create a new livestream
  async createLivestream(streamData) {
    const { title, description, streamerId, products } = streamData;
    
    // Verify streamer exists and is a seller
    const streamer = await User.findById(streamerId);
    if (!streamer || streamer.role !== 'seller') {
      throw new Error('Invalid streamer or not a seller');
    }

    const newStream = new Livestream({
      title,
      description,
      streamer: streamerId,
      products,
      status: 'scheduled'
    });

    await newStream.save();
    return newStream;
  }

  // Start a scheduled livestream
  async startLivestream(streamId, streamerId) {
    const stream = await Livestream.findById(streamId);
    if (!stream || stream.streamer.toString() !== streamerId) {
      throw new Error('Stream not found or unauthorized');
    }

    if (stream.status !== 'scheduled') {
      throw new Error('Stream is not in scheduled status');
    }

    stream.status = 'live';
    stream.startTime = new Date();
    await stream.save();

    // Initialize stream room with WebRTC config
    this.activeStreams.set(streamId, {
      streamerId,
      viewers: new Set(),
      rtcConfig: this.streamConfig,
      connections: new Map()  // Store peer connections
    });

    return {
      ...stream.toObject(),
      rtcConfig: this.streamConfig
    };
  }

  // End an existing livestream
  async endLivestream(streamId, streamerId) {
    const stream = await Livestream.findById(streamId);
    if (!stream || stream.streamer.toString() !== streamerId) {
      throw new Error('Stream not found or unauthorized');
    }

    stream.status = 'ended';
    stream.endTime = new Date();
    await stream.save();

    // Cleanup stream and notify all connected peers
    if (this.activeStreams.has(streamId)) {
      const streamInfo = this.activeStreams.get(streamId);
      
      // Notify all connected peers about stream end
      this.io.to(streamId).emit('streamEnded', { 
        streamId,
        message: 'Stream has ended'
      });

      // Close all peer connections
      streamInfo.connections.forEach(connection => {
        if (connection.peerConnection) {
          connection.peerConnection.close();
        }
      });

      this.activeStreams.delete(streamId);
    }

    return stream;
  }

  // Join livestream as viewer
  async joinLivestream(streamId, userId) {
    const stream = await Livestream.findById(streamId)
      .populate('streamer', 'name shopName avatar')
      .populate('products', 'name price images');

    if (!stream || stream.status !== 'live') {
      throw new Error('Stream not found or not live');
    }

    if (!this.activeStreams.has(streamId)) {
      throw new Error('Stream room not initialized');
    }

    const streamInfo = this.activeStreams.get(streamId);
    streamInfo.viewers.add(userId);

    return {
      stream: stream.toObject(),
      rtcConfig: this.streamConfig,
      viewerCount: streamInfo.viewers.size
    };
  }

  // Leave livestream
  async leaveLivestream(streamId, userId) {
    if (this.activeStreams.has(streamId)) {
      const streamInfo = this.activeStreams.get(streamId);
      streamInfo.viewers.delete(userId);

      const stream = await Livestream.findById(streamId);
      if (stream) {
        this.io.to(streamId).emit('viewerCount', streamInfo.viewers.size);
      }
    }
  }

  // Get stream information
  async getStreamInfo(streamId) {
    const stream = await Livestream.findById(streamId)
      .populate('streamer', 'name shopName avatar')
      .populate('products', 'name price images');

    if (!stream) {
      throw new Error('Stream not found');
    }

    const streamInfo = this.activeStreams.get(streamId) || { viewers: new Set() };

    return {
      ...stream.toObject(),
      viewerCount: streamInfo.viewers.size,
      isLive: stream.status === 'live'
    };
  }

  // Handle product showcase in stream
  async showcaseProduct(streamId, productId, streamerId) {
    const stream = await Livestream.findById(streamId);
    if (!stream || stream.streamer.toString() !== streamerId) {
      throw new Error('Stream not found or unauthorized');
    }

    if (!stream.products.includes(productId)) {
      throw new Error('Product not in stream catalog');
    }

    this.io.to(streamId).emit('showcaseProduct', { productId });
  }

  // Handle stream reactions (hearts)
  broadcastHeart(streamId, userId) {
    if (!this.activeStreams.has(streamId)) return;
    this.io.to(streamId).emit('heart', { userId });
  }
}

module.exports = LivestreamService;
