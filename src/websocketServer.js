// src/websocketServer.js
const Message = require("./models/MessageModel");
const Conversation = require("./models/ConversationModel");
const User = require("./models/UserModel");
const ConversationController = require("./controllers/ConversationController");

class ChatService {
  constructor(wss) {
    this.wss = wss;
    this.clients = {}; // Lưu trữ client theo userId

    // Khởi động sự kiện connection
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  async handleConnection(ws) {
    console.log("A new client connected");

    // Đăng ký sự kiện message và close cho WebSocket kết nối mới
    ws.on("message", async (data) => {
      const messageData = JSON.parse(data);

      // Kiểm tra loại tin nhắn
      if (messageData.type === "register") {
        const userId = messageData.userId;

        // Lưu trữ client với userId
        this.addClient(userId, ws);
        console.log(`User registered with ID: ${userId}`);

        // Sau khi đăng ký, kiểm tra các tin nhắn chưa được gửi
        const unreadMessages = await Message.find({
          recipientId: userId,
          isDelivered: false,
        });

        unreadMessages.forEach(async (msg) => {
          ws.send(
            JSON.stringify({
              type: "chatMessage",
              conversationId: msg.conversationId,
              sender: msg.sender,
              content: msg.content,
              timestamp: msg.timestamp,
            })
          );

          // Cập nhật trạng thái tin nhắn là đã gửi
          msg.isDelivered = true;
          await msg.save();
        });
      } else {
        // Xử lý các tin nhắn khác (ví dụ: tin nhắn chat)
        this.handleMessage(ws, data);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      this.removeClient(ws);
    });
  }

  // addClient(userId, ws) {
  //   this.clients[userId] = ws;
  //   console.log(`User ${userId} connected`);
  // }

  // removeClient(ws) {
  //   Object.keys(this.clients).forEach((userId) => {
  //     this.clients[userId] = this.clients[userId].filter(
  //       (client) => client !== ws
  //     );
  //     if (this.clients[userId].length === 0) {
  //       delete this.clients[userId];
  //     }
  //   });
  // }

  addClient(userId, ws) {
    if (!this.clients[userId]) {
      this.clients[userId] = []; // Khởi tạo mảng nếu chưa tồn tại
    }
    this.clients[userId].push(ws); // Thêm WebSocket mới vào mảng
  }

  removeClient(ws) {
    Object.keys(this.clients).forEach((userId) => {
      if (Array.isArray(this.clients[userId])) {
        // Lọc bỏ WebSocket đã đóng
        this.clients[userId] = this.clients[userId].filter(
          (client) => client !== ws
        );
        // Nếu không còn kết nối nào, xóa userId khỏi đối tượng clients
        if (this.clients[userId].length === 0) {
          delete this.clients[userId];
        }
      }
    });
  }

  async handleMessage(ws, data) {
    const messageData = JSON.parse(data);

    // Kiểm tra loại tin nhắn và gọi hàm xử lý tương ứng
    if (messageData.type === "register") {
      // Đăng ký người dùng
      const { userId } = messageData;
      this.addClient(userId, ws);
      console.log(`User registered with ID: ${userId}`);
    } else if (messageData.type === "chatMessage") {
      await this.handleChatMessage(ws, messageData);
    } else if (messageData.type === "getHistory") {
      await this.handleGetHistory(ws, messageData);
    } else if (messageData.type === "getConversations") {
      await this.handleGetConversation2(ws, messageData);
    }
  }

  async handleChatMessage(ws, messageData) {
    const { conversationId, sender, content, recipientId } = messageData;

    try {
      // Lấy thông tin người gửi từ cơ sở dữ liệu
      const senderInfo = await User.findById(sender).select(
        "name avatar shopName role"
      );
      if (!senderInfo) {
        throw new Error("Sender not found");
      }

      // Xác định vai trò và thêm shopName nếu role là 'seller'
      const senderData = {
        senderId: sender,
        senderName: senderInfo.name,
        senderAvatar: senderInfo.avatar,
        ...(senderInfo.role === "seller" && { senderName: senderInfo.shopName }), // Thêm shopName nếu role là seller
      };

      // Lưu tin nhắn vào MongoDB
      const newMessage = new Message({
        conversationId,
        sender,
        content,
        timestamp: new Date(),
        isDelivered: !!(
          this.clients[recipientId] && this.clients[recipientId].length > 0
        ),
      });

      await newMessage.save();

      // Dữ liệu tin nhắn trả về
      const responseMessage = {
        conversationId,
        messageId: newMessage._id,
        ...senderData, // Gộp thông tin người gửi
        content,
        time: newMessage.timestamp,
      };

      // Phản hồi thành công cho người gửi
      ws.send(
        JSON.stringify({
          status: "success",
          message: "Message sent successfully",
        })
      );

      // Gửi tin nhắn đến tất cả kết nối của người nhận
      const recipientSockets = this.clients[recipientId];
      if (recipientSockets && recipientSockets.length > 0) {
        recipientSockets.forEach((socket) => {
          /**
          {
              "messageId": "674311590f89bac711674fb6",
              "senderId": "670fbccb69c796fe8ad0f8d6",
              "senderName": "Nguyễn Công Tú",
              "senderAvatar": "https://res.cloudinary.com/dfxkyz3ay/image/upload/v1732292564/avatar/ognixl1zidpshnatg0uw.png",
              "content": "client send seller",
              "time": "2024-11-24T11:43:21.748Z"
          } => trả về như thế này
           */

          socket.send(
            JSON.stringify({
              type: "chatMessage",
              ...responseMessage,
            })
          );
        });
      } else {
        console.log(`Recipient with ID ${recipientId} is not connected`);
      }
    } catch (error) {
      console.error("Failed to save message:", error);
      ws.send(
        JSON.stringify({
          status: "error",
          message: "Failed to send message",
        })
      );
    }
    //   const recipientSocket = this.clients[recipientId];
    //   if (recipientSocket && typeof recipientSocket.send === "function") {
    //     recipientSocket.send(
    //       JSON.stringify({
    //         type: "chatMessage",
    //         conversationId,
    //         sender,
    //         content,
    //         timestamp: new Date(),
    //       })
    //     );
    //     newMessage.isDelivered = true; // Đã gửi thành công
    //     await newMessage.save();
    //   } else {
    //     console.log(`Recipient with ID ${recipientId} is not connected`);
    //   }

    //   // Phản hồi thành công cho client gửi tin nhắn
    //   ws.send(
    //     JSON.stringify({
    //       status: "success",
    //       message: "Message sent successfully",
    //     })
    //   );
    // } catch (error) {
    //   console.log("Failed to save message:", error); // Log lỗi nếu có
    //   ws.send(
    //     JSON.stringify({
    //       status: "error",
    //       message: "Failed to send message",
    //     })
    //   );
    // }
  }

  async handleGetHistory(ws, requestData) {
    const { conversationId, userId } = requestData;

    try {
      // Lấy lịch sử tin nhắn từ MongoDB
      const messages = await Message.find({ conversationId })
        .sort({
          timestamp: 1,
        })
        .populate({
          path: "sender",
          select: "name shopName avatar role",
        });

      // Lấy danh sách thành viên trong cuộc hội thoại từ Conversation
      const conversation = await Conversation.findById(conversationId);
      const memberIds = conversation ? conversation.members : [];

      const recipientId = memberIds.find((id) => id.toString() !== userId);

      // Lấy thông tin của người nhận
      const recipient = await User.findById(
        recipientId,
        "name avatar shopName role"
      );
      const recipientName =
        recipient.role === "seller" ? recipient.shopName : recipient.name;

      // Phản hồi cho client với lịch sử tin nhắn và thông tin người nhận
      ws.send(
        JSON.stringify({
          status: "success",
          // recipient: {
          //   recipientId: recipient._id,
          //   recipientName,
          //   recipientAvatar: recipient.avatar,
          // }, -> sửa thành cái ở dưới
          type: "getHistory",
          conversationId: conversationId,
          recipientId: recipient._id,
          recipientName,
          recipientAvatar: recipient.avatar,
          messages: messages.map((msg) => ({
            messageId: msg._id,
            senderId: msg.sender._id,
            senderName:
              msg.sender.role === "seller"
                ? msg.sender.shopName
                : msg.sender.name,
            senderAvatar: msg.sender.avatar,
            content: msg.content,
            time: msg.timestamp,
          })),
        })
      );
    } catch (error) {
      ws.send(
        JSON.stringify({
          status: "error",
          message: "Failed to retrieve messages",
        })
      );
    }
  }

  // thêm hàm mới giống hàm này hoặc giữ nguyên
  async handleGetConversation2(ws, requestData) {
    ConversationController.getUserConversations2(ws, requestData);
  }
}

module.exports = (wss) => new ChatService(wss);
