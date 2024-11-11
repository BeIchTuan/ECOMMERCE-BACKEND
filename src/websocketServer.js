// src/websocketServer.js
const Message = require("./models/MessageModel");
const Conversation = require("./models/ConversationModel");
const User = require("./models/UserModel");

class ChatService {
  constructor(wss) {
    this.wss = wss;
    this.clients = {}; // Lưu trữ client theo userId

    // Khởi động sự kiện connection
    this.wss.on("connection", (ws) => this.handleConnection(ws));
  }

  handleConnection(ws) {
    console.log("A new client connected");

    // Xử lý các tin nhắn từ client
    ws.on("message", (data) => this.handleMessage(ws, data));

    // Xử lý khi client đóng kết nối
    ws.on("close", () => {
      console.log("Client disconnected");
      this.removeClient(ws);
    });
  }

  // Lưu trữ client vào đối tượng `clients`
  addClient(userId, ws) {
    this.clients[userId] = ws;
  }

  // Xóa client khi ngắt kết nối
  removeClient(ws) {
    Object.keys(this.clients).forEach((userId) => {
      if (this.clients[userId] === ws) {
        delete this.clients[userId];
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
    }
  }

  async handleChatMessage(ws, messageData) {
    const { conversationId, sender, content, recipientId } = messageData;

    try {
      // Lưu tin nhắn vào MongoDB
      const newMessage = new Message({
        conversationId,
        sender,
        content,
        timestamp: new Date(),
      });

      await newMessage.save();

      // Phản hồi thành công cho client gửi tin nhắn
      ws.send(
        JSON.stringify({
          status: "success",
          message: "Message sent successfully",
        })
      );

      // Gửi tin nhắn cho người nhận nếu họ đang kết nối
      const recipientSocket = this.clients[recipientId];
      if (recipientSocket) {
        recipientSocket.send(
          JSON.stringify({
            type: "chatMessage",
            conversationId,
            sender,
            content,
            timestamp: new Date(),
          })
        );
      }
    } catch (error) {
      console.log("Failed to save message:", error); // Log lỗi nếu có
      ws.send(
        JSON.stringify({
          status: "error",
          message: "Failed to send message",
        })
      );
    }
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
          recipient: {
            recipientId: recipient._id,
            recipientName,
            recipientAvatar: recipient.avatar,
          },
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
}

module.exports = (wss) => new ChatService(wss);
