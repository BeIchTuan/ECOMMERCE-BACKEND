// controllers/conversationController.js
const Conversation = require("../models/ConversationModel");

class ConversationController {
  async createConversation(req, res) {
    try {
      const { members } = req.body;

      // Kiểm tra xem members có đủ hai người dùng không
      if (!Array.isArray(members) || members.length !== 2) {
        return res.status(400).json({
          status: "error",
          message: "Conversation must have exactly two members",
        });
      }

      // Sắp xếp members để đảm bảo thứ tự không ảnh hưởng đến việc tìm kiếm
      const sortedMembers = members.sort();

      // Kiểm tra xem cuộc hội thoại giữa hai người đã tồn tại chưa
      const existingConversation = await Conversation.findOne({
        members: sortedMembers,
      });

      if (existingConversation) {
        // Nếu đã tồn tại, trả về conversationId hiện tại
        return res.status(200).json({
          status: "success",
          conversationId: existingConversation._id,
          message: "Conversation already exists",
        });
      }

      // Tạo cuộc hội thoại mới nếu chưa tồn tại
      const newConversation = new Conversation({ members: sortedMembers });
      await newConversation.save();

      return res.status(201).json({
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
      const conversations = await Conversation.find({
        members: { $in: [userId] },
      })
        .populate({
          path: "members",
          select: "name shopName avatar role",
        })
        .lean();

      // Filter out conversations where recipient exists and map the data
      const conversationsWithRecipientInfo = conversations
        .map((conversation) => {
          const recipient = conversation.members.find(
            (member) => member && member._id && member._id.toString() !== userId
          );

          // Skip this conversation if recipient is null or undefined
          if (!recipient) return null;

          return {
            conversationId: conversation._id,
            recipientId: recipient._id,
            recipientName:
              recipient.role === "seller" ? recipient.shopName : recipient.name,
            recipientAvatar: recipient.avatar,
          };
        })
        .filter(conv => conv !== null); // Remove null entries

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

  async getUserConversations2(ws, requestData) {
    console.log("getUserConversations2");
    
    try {
      const { userId } = requestData;
// Tìm tất cả các cuộc hội thoại mà user là thành viên
      const conversations = await Conversation.find({
        members: { $in: [userId] },
      })
        .populate({
          path: "members",
          select: "name shopName avatar role",
        })
        .lean();

      // Filter out conversations where recipient exists and map the data
      const conversationsWithRecipientInfo = conversations
        .map((conversation) => {
          const recipient = conversation.members.find(
            (member) => member && member._id && member._id.toString() !== userId
          );

          // Skip this conversation if recipient is null or undefined
          if (!recipient) return null;

          return {
            conversationId: conversation._id,
            recipientId: recipient._id,
            recipientName:
              recipient.role === "seller" ? recipient.shopName : recipient.name,
            recipientAvatar: recipient.avatar,
          };
        })
        .filter(conv => conv !== null); // Remove null entries

      return ws.send(
        JSON.stringify({
          type: "getConversations",
          status: "success",
          conversations: conversationsWithRecipientInfo,
          message: "Conversations retrieved successfully",
        })
      );
    } catch (error) {
      return ws.send(
        JSON.stringify({
          type: "getConversations",
          status: "error",
          message: "Failed to retrieve conversations",
        })
      );
    }
  }
}

module.exports = new ConversationController();
