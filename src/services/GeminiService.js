require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/ProductModel");
const Conversation = require("../models/ConversationModel");
const Message = require("../models/MessageModel");
const mongoose = require("mongoose");
class GeminiService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        this.chatbotId = new mongoose.Types.ObjectId("64ed2e2f9b1e78d256b89abc"); // Tạo sẵn ID cho chatbot
        //this.baseURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
    }

    async searchProducts(query) {
        try {
            console.log("Tìm kiếm sản phẩm với từ khóa:", query);
            const results = await Product.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                ],
            }).exec();
            return results;
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error);
            return [];
        }
    }

    // async ask(question) {
    //     try {
    //         const response = await this.model.generateContent(question);
    //         return response.response.text();
    //     } catch (error) {
    //         console.error("Lỗi gọi Gemini API:", error);
    //         throw new Error("Không thể lấy phản hồi từ Gemini.");
    //     }
    // }

    async ask(message, productInfo = null) {
        try {
            const prompt = productInfo
                ? `Khách hàng hỏi: '${message}'. Thông tin sản phẩm: ${productInfo}. Trả lời ngắn gọn, thân thiện và hữu ích, như một chatbot thương mại điện tử.`
                : `Khách hàng hỏi: '${message}'. Trả lời ngắn gọn, thân thiện và tự nhiên, như một chatbot thương mại điện tử.`;

            const timeout = 10000; // 10 giây
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout);
            });

            const responsePromise = this.model.generateContent(prompt);
            const result = await Promise.race([responsePromise, timeoutPromise]);
            const response = await result.response.text();
            return response;
        } catch (error) {
            console.error('Lỗi gọi Gemini API:', error);
            throw new Error(`Xin lỗi, mình gặp lỗi khi xử lý: ${error.message}`);
        }
    }

    async consultProduct(productIds, question) {
        try {
            const products = await Product.find({
                _id: { $in: productIds },
            }).exec();

            if (products.length === 0) {
                return "Xin lỗi, không tìm thấy sản phẩm nào với ID bạn cung cấp!";
            }

            const productInfo = products
                .map((p) => `- ${p.name}: ${p.priceAfterSale} VND, còn ${p.inStock} hàng`)
                .join('\n');

            // Gửi câu hỏi và thông tin sản phẩm tới Gemini
            const prompt = `Khách hàng hỏi: '${question}'. Thông tin sản phẩm: ${productInfo}. Trả lời ngắn gọn, thân thiện và hữu ích, như một chatbot thương mại điện tử.`;
            const timeout = 10000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout);
            });

            const responsePromise = this.model.generateContent(prompt);
            const result = await Promise.race([responsePromise, timeoutPromise]);
            const response = await result.response.text();
            return response;
        } catch (error) {
            console.error('Lỗi tư vấn sản phẩm:', error);
            throw new Error(`Xin lỗi, mình gặp lỗi khi tư vấn: ${error.message}`);
        }
    }

    async saveChatInteraction(userId, endpoint, userInput, botResponse) {
        try {
            // Tìm hoặc tạo cuộc trò chuyện
            let conversation = await Conversation.findOne({
                type: 'chatbot',
                members: [userId],
            });

            if (!conversation) {
                conversation = new Conversation({
                    members: [userId],
                    type: 'chatbot',
                });
                await conversation.save();
            }

            console.log(userId, endpoint, userInput, botResponse)

            // Lưu câu hỏi của người dùng
            const userMessage = new Message({
                conversationId: conversation._id,
                sender: userId,
                // content: endpoint === 'chat'
                //     ? userInput.message
                //     : `${userInput.question} (productIds: [${userInput.productIds || []}])`,
                content: userInput.question || userInput.message,
                isDelivered: true,
            });
            await userMessage.save();

            // Lưu câu trả lời của chatbot
            const botMessageContent = endpoint === 'chat' && botResponse.productIds.length > 0
                ? `${botResponse.response} (productIds: [${botResponse.productIds}])`
                : botResponse.response;

            const botMessage = new Message({
                conversationId: conversation._id,
                sender: this.chatbotId,
                content: botMessageContent,
                isDelivered: true,
            });
            await botMessage.save();

            console.log('Đã lưu tương tác chatbot!');
        } catch (error) {
            console.error('Lỗi lưu tương tác:', error);
        }
    }

    async getChatHistory(userId) {
        try {
            // Tìm cuộc trò chuyện chatbot của user
            const conversation = await Conversation.findOne({
                type: 'chatbot',
                members: [userId],
            });

            if (!conversation) {
                return [];
            }

            // Lấy tất cả tin nhắn, sắp xếp theo timestamp
            const messages = await Message.find({
                conversationId: conversation._id,
            })
                .select('sender content timestamp')
                .sort({ timestamp: 1 })
                .exec();

            return messages.map(msg => ({
                sender: msg.sender.toString(),
                content: msg.content,
                timestamp: msg.timestamp,
            }));
        } catch (error) {
            console.error('Lỗi lấy lịch sử trò chuyện:', error);
            throw new Error('Xin lỗi, không thể lấy lịch sử trò chuyện!');
        }
    }
}

module.exports = new GeminiService();

