const Livestream = require('../models/LivestreamModel');
const User = require('../models/UserModel');

class LivestreamService {
  constructor() {
    this.activeStreams = new Map(); // Store active stream sessions
    this.streamConfig = {
      iceServers: [{ urls: ["stun:hk-turn1.xirsys.com"] }, { username: "UZZ9w3qLFalCB97klw3yrHKTkolYEAqeukuKiGqdqcYG63BqsCY-tKJL7sKCGCW_AAAAAGgyn3hiZWljaHR1YW4=", credential: "8606e89c-3922-11f0-aa13-0242ac120004", urls: ["turn:hk-turn1.xirsys.com:80?transport=udp", "turn:hk-turn1.xirsys.com:3478?transport=udp", "turn:hk-turn1.xirsys.com:80?transport=tcp", "turn:hk-turn1.xirsys.com:3478?transport=tcp", "turns:hk-turn1.xirsys.com:443?transport=tcp", "turns:hk-turn1.xirsys.com:5349?transport=tcp"] }],
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan'
    };
  }
  // Get all active livestreams
  async getAllLivestreams() {
    const streams = await Livestream.find({ status: 'live' })
      .populate('streamer', 'name shopName avatar')
      .populate('products', 'name price image')
      .populate('pinnedProduct', 'name description SKU price category inStock image seller sold averageStar rateCount priceAfterSale salePercent isDeleted thumbnail rates');

    // Thêm số lượng người xem cho mỗi stream
    const streamsWithViewers = streams.map(stream => {
      const streamInfo = this.activeStreams.get(stream._id.toString());
      const viewerCount = streamInfo ? streamInfo.viewers.size : 0;
      
      return {
        ...stream.toObject(),
        viewerCount,
        viewers: viewerCount 
      };
    });

    return streamsWithViewers;
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
    try {
      const stream = await Livestream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      if (stream.streamer.toString() !== streamerId) {
        throw new Error('Not authorized to start this stream');
      }

      // Allow restarting a stream if it's either scheduled or was live
      if (stream.status !== 'scheduled' && stream.status !== 'live') {
        throw new Error('Stream cannot be started in current status');
      }

      stream.status = 'live';
      stream.startTime = new Date();
      await stream.save();

      console.log(`Initializing stream room for stream ${streamId}`);

      // Initialize stream room with WebRTC config if not exists
      if (!this.activeStreams.has(streamId)) {
        const streamInfo = {
          streamerId,
          viewers: new Set(),
          rtcConfig: this.streamConfig,
          connections: new Map()
        };

        this.activeStreams.set(streamId, streamInfo);
        console.log(`Stream room initialized with config:`, {
          streamId,
          streamerId,
          rtcConfig: this.streamConfig
        });
      }

      // Notify through Socket.IO about stream start
      const streamData = stream.toObject();
      return {
        ...streamData,
        rtcConfig: this.streamConfig
      };
    } catch (error) {
      console.error('Error in startLivestream:', error);
      throw error;
    }
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
    try {
      console.log(`Attempting to join stream ${streamId} for user ${userId}`);
      const stream = await Livestream.findById(streamId)
        .populate('streamer', 'name shopName avatar')
        .populate('products', 'name price image')
        .populate('pinnedProduct', 'name description SKU price category inStock image seller sold averageStar rateCount priceAfterSale salePercent isDeleted thumbnail rates');

      if (!stream) {
        throw new Error('Stream not found');
      }

      if (stream.status !== 'live') {
        throw new Error('Stream is not live');
      }

      // Get or create stream room
      let streamInfo = this.activeStreams.get(streamId);
      if (!streamInfo) {
        console.log(`Creating new stream room for ${streamId}`);
        streamInfo = {
          streamerId: stream.streamer._id.toString(),
          viewers: new Set(),
          rtcConfig: this.streamConfig,
          connections: new Map()
        };
        this.activeStreams.set(streamId, streamInfo);
      }

      // Add viewer if not already in the room
      if (!streamInfo.viewers.has(userId)) {
        console.log(`Adding viewer ${userId} to stream ${streamId}`);
        streamInfo.viewers.add(userId);
      }

      console.log(`Stream ${streamId} current viewers:`, {
        viewers: Array.from(streamInfo.viewers),
        count: streamInfo.viewers.size
      });

      return {
        stream: stream.toObject(),
        rtcConfig: this.streamConfig,
        viewerCount: streamInfo.viewers.size
      };
    } catch (error) {
      console.error('Error in joinLivestream:', error);
      throw error;
    }
  }

  // Leave livestream
  async leaveLivestream(streamId, userId) {
    try {
      console.log(`User ${userId} leaving stream ${streamId}`);

      if (!this.activeStreams.has(streamId)) {
        console.log(`Stream ${streamId} not found in active streams`);
        return;
      }

      const streamInfo = this.activeStreams.get(streamId);
      if (streamInfo.viewers.has(userId)) {
        streamInfo.viewers.delete(userId);
        console.log(`Removed viewer ${userId} from stream ${streamId}`);

        console.log(`Stream ${streamId} current viewers:`, {
          viewers: Array.from(streamInfo.viewers),
          count: streamInfo.viewers.size
        });
      }
    } catch (error) {
      console.error('Error in leaveLivestream:', error);
    }
  }

  // Get stream information
  async getStreamInfo(streamId) {
    const stream = await Livestream.findById(streamId)
      .populate('streamer', 'name shopName avatar')
      .populate('products', 'name price image')
      .populate('pinnedProduct', 'name description SKU price category inStock image seller sold averageStar rateCount priceAfterSale salePercent isDeleted thumbnail rates');

    if (!stream) {
      throw new Error('Stream not found');
    }

    // Lấy thông tin từ activeStreams nếu có
    const streamInfo = this.activeStreams.get(streamId) || { viewers: new Set() };
    const viewerCount = streamInfo.viewers ? streamInfo.viewers.size : 0;

    console.log(`Stream ${streamId} current viewers:`, {
      viewers: Array.from(streamInfo.viewers || []),
      count: viewerCount
    });

    return {
      ...stream.toObject(),
      viewerCount,
      viewers: viewerCount, // Thêm field này để tương thích với frontend
      isLive: stream.status === 'live',
      rtcConfig: stream.status === 'live' ? this.streamConfig : null
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
