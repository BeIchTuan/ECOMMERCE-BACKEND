const LivestreamService = require('../services/LivestreamService');

const livestreamService = new LivestreamService();

class LivestreamController {
  async getLivestreams(req, res) {
    try {
      const livestreams = await livestreamService.getAllLivestreams();
      return res.status(200).json({
        status: 'success',
        data: livestreams
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async createLivestream(req, res) {
    try {
      const streamData = {
        title: req.body.title,
        description: req.body.description,
        streamerId: req.id,
        products: req.body.products || []
      };

      console.log("Creating livestream with data:", streamData);

      const newStream = await livestreamService.createLivestream(streamData);
      return res.status(201).json({
        status: 'success',
        data: newStream
      });
    } catch (error) {
      console.error("Error creating livestream:", error);
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async startLivestream(req, res) {
    try {
      const streamId = req.params.id;
      const streamerId = req.id;

      const stream = await livestreamService.startLivestream(streamId, streamerId);
      
      let token = req.cookies.accessToken || req.headers['authorization'];
      if (token && token.startsWith("Bearer ")) {
        token = token.slice(7);
      }

      return res.status(200).json({
        status: 'success',
        data: {
          ...stream,
          wsUrl: `ws://localhost:8081?token=${token}`,
          rtcConfig: stream.rtcConfig
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async endLivestream(req, res) {
    try {
      const streamId = req.params.id;
      const streamerId = req.id;

      const stream = await livestreamService.endLivestream(streamId, streamerId);
      return res.status(200).json({
        status: 'success',
        data: stream
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  async getStreamInfo(req, res) {
    try {
      const streamId = req.params.id;
      
      // Nếu user yêu cầu join làm viewer
      if (req.query.join === 'true') {
        // Join user vào stream và lấy thông tin stream
        const streamInfo = await livestreamService.joinLivestream(streamId, req.id);
        
        // Lấy token từ cookie hoặc header
        let token = req.cookies.accessToken || req.headers['authorization'];
        if (token && token.startsWith("Bearer ")) {
          token = token.slice(7);
        }

        return res.status(200).json({
          status: 'success',
          data: {
            ...streamInfo.stream,
            viewerCount: streamInfo.viewerCount,
            wsUrl: `ws://localhost:8081?token=${token}`,
            rtcConfig: streamInfo.rtcConfig
          }
        });
      }

      // Nếu chỉ xem thông tin stream
      const streamInfo = await livestreamService.getStreamInfo(streamId);
      return res.status(200).json({
        status: 'success',
        data: streamInfo
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }

  // WebSocket handlers for realtime interactions
  handleJoinStream(ws, data) {
    try {
      const { streamId, userId } = data;
      livestreamService.joinLivestream(streamId, userId);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleLeaveStream(ws, data) {
    try {
      const { streamId, userId } = data;
      livestreamService.leaveLivestream(streamId, userId);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleChatMessage(ws, data) {
    try {
      const { streamId, message, user } = data;
      livestreamService.broadcastMessage(streamId, message, user);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleShowcaseProduct(ws, data) {
    try {
      const { streamId, productId, streamerId } = data;
      livestreamService.showcaseProduct(streamId, productId, streamerId);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  handleHeartReaction(ws, data) {
    try {
      const { streamId, userId } = data;
      livestreamService.broadcastHeart(streamId, userId);
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }
}

module.exports = new LivestreamController();
