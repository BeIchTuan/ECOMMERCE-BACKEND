require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/ProductModel");
const Conversation = require("../models/ConversationModel");
const Message = require("../models/MessageModel");
const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const mongoose = require("mongoose");

const SYSTEM_INSTRUCTIONS = `
Bạn là trợ lý chat thông minh và thân thiện của website thương mại điện tử Phố Mua Sắm.
Hãy tương tác như một nhân viên tư vấn mua sắm nhiệt tình:
1. Trò chuyện tự nhiên, thân thiện và gần gũi như con người thật.
2. Tư vấn chi tiết về sản phẩm, bao gồm các ưu đãi, khuyến mãi và mã giảm giá đang áp dụng.
3. Luôn nhắc khách hàng về các chương trình giảm giá hoặc voucher hiện có nếu phù hợp với sản phẩm.
4. Tránh hoàn toàn các chủ đề nhạy cảm như chính trị, tôn giáo, hay vấn đề xã hội gây tranh cãi.
5. Không đưa ra lời khuyên y tế, pháp lý hoặc tài chính chuyên môn.
6. Bảo vệ an toàn thông tin cá nhân của khách hàng.
7. Không bịa ra nhưng thông tin không có thật, không cung cấp thông tin sai lệch về sản phẩm hoặc dịch vụ.
8. Nếu khách hàng hỏi về sản phẩm không có trong kho, hãy đề xuất các sản phẩm tương tự hoặc liên quan.
9. Nếu khách hàng hỏi không liên quan đến sản phẩm, hãy trả lời một cách lịch sự và chuyển hướng về sản phẩm hoặc dịch vụ của bạn.`

const RESPONSE_INSTRUCTIONS = `
Trả lời với giọng điệu tự nhiên và thân thiện như một nhân viên tư vấn bán hàng thực sự:
1. Sử dụng ngôn ngữ đời thường, chuyên nghiệp và có cảm xúc (thêm emoji vui vẻ, tích cực nếu phù hợp)
2. Nhắc đến các khuyến mãi và mã giảm giá đang áp dụng cho sản phẩm khách hàng quan tâm, nếu đã nhắc trước đó về sản phẩm thì hạn chế nhắc lại
3. Gợi ý các mức giảm giá theo từng cấp độ (ví dụ: giảm 5% cho đơn từ 200k, 10% cho đơn từ 500k)
4. Nhấn mạnh về thời gian còn lại của khuyến mãi để tạo cảm giác cấp bách (nếu có)
5. Đề xuất các sản phẩm bổ sung có liên quan để tăng giá trị đơn hàng
6. Trả lời ngắn gọn trong 2-4 câu trừ khi cần thiết phải chi tiết hơn`

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
            }).limit(10).exec();
            return results;
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error);
            return [];
        }
    }

    async getPreviousMessages(userId, limit = 10) {
        try {
            // Find user's conversation
            const conversation = await Conversation.findOne({
                type: 'chatbot',
                members: [userId],
            });

            if (!conversation) {
                return [];
            }

            // Get the most recent messages
            const messages = await Message.find({
                conversationId: conversation._id,
            })
                .sort({ timestamp: -1 })
                .limit(limit)
                .select('sender content')
                .exec();

            // Return in chronological order
            return messages.reverse();
        } catch (error) {
            console.error('Error getting previous messages:', error);
            return [];
        }
    }

    async getUserContext(userId) {
        try {
            if (!userId) return null;

            // Get basic user information
            const user = await User.findById(userId).select('name gender role favoriteProducts');

            if (!user) return null;

            // Get user's purchase history summary
            const orders = await Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('products.product', 'name category');

            // Create user context object
            const userContext = {
                name: user.name || 'Khách hàng',
                gender: user.gender || 'không xác định',
                role: user.role,
                favoriteCategories: [],
                purchaseHistory: []
            };

            // Extract favorite categories from orders
            if (orders && orders.length > 0) {
                const categoryMap = new Map();

                // Process orders to find frequently purchased categories
                orders.forEach(order => {
                    order.products.forEach(item => {
                        if (item.product && item.product.category) {
                            const category = item.product.category.toString();
                            categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
                        }
                    });

                    // Add order to purchase history
                    userContext.purchaseHistory.push({
                        date: order.createdAt,
                        products: order.products.map(p => p.product?.name || 'Sản phẩm')
                    });
                });

                // Get top categories
                userContext.favoriteCategories = [...categoryMap.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(entry => entry[0]);
            }

            return userContext;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin người dùng:', error);
            return null;
        }
    }

    async ask(message, productInfo = null, userId = null) {
        try {
            let contextMessages = [];
            let userContext = null;

            // Get user context if userId is provided
            if (userId) {
                userContext = await this.getUserContext(userId);
                const previousMessages = await this.getPreviousMessages(userId);
                if (previousMessages.length > 0) {
                    contextMessages = previousMessages.map(msg => {
                        const role = msg.sender.toString() === this.chatbotId.toString() ? 'assistant' : 'user';
                        return `${role}: ${msg.content}`;
                    }).join('\n');
                }
            }

            // Build optimized prompt with context
            let prompt = "";

            // System instruction part
            prompt += SYSTEM_INSTRUCTIONS + "\n\n";

            // User context part
            if (userContext) {
                prompt += `Thông tin về khách hàng:\n`;
                prompt += `- Tên: ${userContext.name}\n`;
                prompt += `- Giới tính: ${userContext.gender}\n`;

                if (userContext.favoriteCategories && userContext.favoriteCategories.length > 0) {
                    prompt += `- Danh mục quan tâm: ${userContext.favoriteCategories.join(', ')}\n`;
                }

                if (userContext.purchaseHistory && userContext.purchaseHistory.length > 0) {
                    prompt += `- Đã từng mua: ${userContext.purchaseHistory.flatMap(order => order.products).slice(0, 3).join(', ')}\n`;
                }
                prompt += '\n';
            }

            // Previous conversation context
            if (contextMessages.length > 0) {
                prompt += `Đây là các tin nhắn trò chuyện gần đây:\n${contextMessages}\n\n`;
                prompt += `Khách hàng hỏi tiếp: '${message}'.\n\n`;
            } else {
                prompt += `Khách hàng hỏi: '${message}'.\n\n`;
            }

            // Product information
            if (productInfo) {
                prompt += `Thông tin sản phẩm liên quan:\n${productInfo}\n\n`;
            }

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${userContext.gender === 'male' ? 'anh' : (userContext.gender === 'female' ? 'chị' : 'bạn')}" nếu phù hợp. `;
            }
            prompt += RESPONSE_INSTRUCTIONS + "\n\n";

            console.log('Prompt:', prompt);

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

    async consultProduct(productIds, question, userId = null) {
        try {
            const products = await Product.find({
                _id: { $in: productIds },
            }).populate('seller', 'shopName').exec();

            if (products.length === 0) {
                return "Xin lỗi, không tìm thấy sản phẩm nào với ID bạn cung cấp!";
            }

            // Lấy thông tin khuyến mãi của các sản phẩm từ người bán
            const sellerIds = [...new Set(products.map(p => p.seller?._id))].filter(Boolean);
            const currentDate = new Date();

            // Lấy thông tin giảm giá/voucher từ DiscountModel
            const Discount = require('../models/DiscountModel');
            const discounts = await Discount.find({
                seller: { $in: sellerIds },
                expireDate: { $gt: currentDate },
                usageLimit: { $gt: 0 }
            }).lean();

            // Tạo thông tin sản phẩm chi tiết kèm khuyến mãi
            const productInfo = products.map((p) => {
                // Tìm các khuyến mãi áp dụng cho shop của sản phẩm này
                const shopDiscounts = discounts.filter(d => d.seller.toString() === p.seller?._id.toString());

                let discountInfo = '';
                if (shopDiscounts && shopDiscounts.length > 0) {
                    discountInfo = '\n    Ưu đãi hiện có: ' + shopDiscounts.map(d =>
                        `Mã "${d.code}": Giảm ${d.discountInPercent}% (tối đa ${d.maxDiscountValue?.toLocaleString('vi-VN')} VND) cho đơn từ ${d.minOrderValue?.toLocaleString('vi-VN')} VND, còn ${Math.round((d.expireDate - currentDate) / (1000 * 60 * 60 * 24))} ngày`
                    ).join('; ');
                }

                return `- ${p.name}: ${p.priceAfterSale.toLocaleString('vi-VN')} VND${p.price !== p.priceAfterSale ? ' (Giảm từ ' + p.price.toLocaleString('vi-VN') + ' VND)' : ''}, còn ${p.inStock} hàng
    Shop: ${p.seller?.shopName || 'Không có thông tin'} ${discountInfo}
    Mô tả: ${p.description ? p.description : 'Không có mô tả'}`;
            }).join('\n\n');

            let contextMessages = [];
            let userContext = null;

            // Get user context and previous messages if userId is provided
            if (userId) {
                userContext = await this.getUserContext(userId);
                const previousMessages = await this.getPreviousMessages(userId);
                if (previousMessages.length > 0) {
                    contextMessages = previousMessages.map(msg => {
                        const role = msg.sender.toString() === this.chatbotId.toString() ? 'assistant' : 'user';
                        return `${role}: ${msg.content}`;
                    }).join('\n');
                }
            }

            // Build optimized prompt with context
            let prompt = "";

            // System instruction part
            prompt += SYSTEM_INSTRUCTIONS + "\n\n";

            // User context part
            if (userContext) {
                prompt += `Thông tin về khách hàng:\n`;
                prompt += `- Tên: ${userContext.name}\n`;
                prompt += `- Giới tính: ${userContext.gender}\n`;

                if (userContext.favoriteCategories && userContext.favoriteCategories.length > 0) {
                    prompt += `- Danh mục quan tâm: ${userContext.favoriteCategories.join(', ')}\n`;
                }

                if (userContext.purchaseHistory && userContext.purchaseHistory.length > 0) {
                    prompt += `- Đã từng mua: ${userContext.purchaseHistory.flatMap(order => order.products).slice(0, 3).join(', ')}\n`;
                }
                prompt += '\n';
            }

            // Previous conversation context
            if (contextMessages.length > 0) {
                prompt += `Đây là các tin nhắn trò chuyện gần đây:\n${contextMessages}\n\n`;
                prompt += `Khách hàng hỏi tiếp về sản phẩm: '${question}'.\n\n`;
            } else {
                prompt += `Khách hàng hỏi về sản phẩm: '${question}'.\n\n`;
            }

            // Product information with promotions
            prompt += `Thông tin chi tiết sản phẩm (đã bao gồm giá giảm và khuyến mãi):\n${productInfo}\n\n`;

            // Bổ sung gợi ý về cách giới thiệu khuyến mãi
            prompt += `Hãy nhớ nhắc khách hàng về các ưu đãi đang có. Khuyến khích khách hàng sử dụng mã giảm giá nếu phù hợp.\n\n`;

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${userContext.gender === 'male' ? 'anh' : (userContext.gender === 'female' ? 'chị' : 'bạn')}" nếu phù hợp. `;
            }
            prompt += RESPONSE_INSTRUCTIONS + "\n\n";

            console.log('Prompt:', prompt);

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
                content: userInput.question || userInput.message,
                isDelivered: true,
            });
            await userMessage.save();

            // Lưu câu trả lời của chatbot
            const botMessageContent = endpoint === 'chat' && botResponse.productIds.length > 0
                ? `${botResponse.response}`
                : botResponse.response;

            const botMessage = new Message({
                conversationId: conversation._id,
                sender: this.chatbotId,
                content: botMessageContent,
                isDelivered: true,
                productIds: botResponse.productIds || [], // Lưu danh sách ID sản phẩm liên quan
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
                .select('sender content timestamp productIds')
                .populate('productIds', 'id name thumbnail price priceAfterSale image')
                .sort({ timestamp: 1 })
                .exec();

            return messages.map(msg => ({
                sender: msg.sender.toString(),
                content: msg.content,
                timestamp: msg.timestamp,
                productDetails: msg.productIds.map(product => ({
                    id: product._id.toString(),
                    name: product.name,
                    thumbnail: product.thumbnail || product.image[0] || null,
                    price: product.price,
                    priceAfterSale: product.priceAfterSale
                }))
            }));
        } catch (error) {
            console.error('Lỗi lấy lịch sử trò chuyện:', error);
            throw new Error('Xin lỗi, không thể lấy lịch sử trò chuyện!');
        }
    }
}

module.exports = new GeminiService();

