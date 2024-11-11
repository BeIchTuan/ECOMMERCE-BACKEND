// controllers/conversationController.js
const Conversation = require("../models/ConversationModel");

class ConversationController {
  async createConversation(req, res) {
    try {
      const { members } = req.body;

      // Tạo cuộc hội thoại mới
      const newConversation = new Conversation({ members });
      await newConversation.save();

      return res.status(200).json({
        status: "success",
        conversationId: newConversation._id,
        message: "Conversation created successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to create conversation",
      });
    }
  }

  async getUserConversations(req, res) {
    try {
      const userId = req.id;
      // Tìm tất cả các cuộc hội thoại mà user là thành viên
      const conversations = await Conversation.find({
        members: { $in: [userId] },
      }).populate({
        path: "members",
        select: "name shopName avatar role", // Chỉ lấy name và avatar của các thành viên
      })
      .lean();  // Sử dụng lean() để kết quả là plain JavaScript objects

      // Lọc và lấy thông tin người nhận cho mỗi cuộc hội thoại
      const conversationsWithRecipientInfo = conversations.map(
        (conversation) => {
          // Lọc để lấy người nhận (khác với user hiện tại)
          const recipient = conversation.members.find(
            (member) => member._id.toString() !== userId
          );

          return {
            conversationId: conversation._id,
            recipientId: recipient._id,
            recipientName: recipient.role === 'seller' ? recipient.shopName : recipient.name,
            recipientAvatar: recipient.avatar,
            //lastMessage: conversation.lastMessage, // Thêm tin nhắn cuối cùng nếu có
          };
        }
      );

      return res.status(200).json({
        status: "success",
        conversations: conversationsWithRecipientInfo,
        message: "Conversations retrieved successfully",
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to retrieve conversations",
      });
    }
  }
}

module.exports = new ConversationController();
