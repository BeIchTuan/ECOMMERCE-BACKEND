require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/ProductModel");
const Conversation = require("../models/ConversationModel");
const Message = require("../models/MessageModel");
const User = require("../models/UserModel");
const Order = require("../models/OrderModel");
const { Cart } = require("../models/CartModel");
const CartService = require("./CartService");
const mongoose = require("mongoose");

const SYSTEM_INSTRUCTIONS = `
Bạn là trợ lý chat thông minh và thân thiện của website thương mại điện tử Phố Mua Sắm.
Hãy tương tác như một nhân viên tư vấn mua sắm nhiệt tình:
1. Trò chuyện tự nhiên, thân thiện và gần gũi như con người thật.
2. Tư vấn chi tiết về sản phẩm, bao gồm các ưu đãi, khuyến mãi và mã giảm giá đang áp dụng.
3. Luôn nhắc khách hàng về các chương trình giảm giá hoặc voucher hiện có nếu phù hợp với sản phẩm.
4. Trả lời chính xác về tình trạng đơn hàng của khách hàng khi được hỏi, sử dụng thông tin thực tế được cung cấp.
5. Giải thích ý nghĩa các trạng thái đơn hàng và thanh toán khi khách hàng có thắc mắc về đơn.
6. Tránh hoàn toàn các chủ đề nhạy cảm như chính trị, tôn giáo, hay vấn đề xã hội gây tranh cãi.
7. Không đưa ra lời khuyên y tế, pháp lý hoặc tài chính chuyên môn.
8. Bảo vệ an toàn thông tin cá nhân của khách hàng.
9. Không bịa ra nhưng thông tin không có thật, không cung cấp thông tin sai lệch về sản phẩm hoặc dịch vụ.
10. Nếu khách hàng hỏi về sản phẩm không có trong kho, hãy đề xuất các sản phẩm tương tự hoặc liên quan.
11. Nếu khách hàng hỏi không liên quan đến sản phẩm hoặc đơn hàng, hãy trả lời một cách lịch sự và chuyển hướng về sản phẩm hoặc dịch vụ của bạn.
12. Sử dụng thông tin giỏ hàng của khách hàng để đưa ra các đề xuất phù hợp và tư vấn mua thêm sản phẩm.
13. Gợi ý 3 hành động tiếp theo để người dùng có thể tiếp tục trò chuyện, liên quan đến ngữ cảnh hiện tại.`

const RESPONSE_INSTRUCTIONS = `
Trả lời với giọng điệu tự nhiên và thân thiện như một nhân viên tư vấn bán hàng thực sự:
1. Sử dụng ngôn ngữ đời thường, chuyên nghiệp và có cảm xúc (thêm emoji vui vẻ, tích cực nếu phù hợp)
2. Khi khách hàng hỏi về đơn hàng, cung cấp thông tin chính xác về tình trạng đơn hàng một cách rõ ràng, dễ hiểu
3. Nếu là câu hỏi về sản phẩm, nhắc đến các khuyến mãi và mã giảm giá đang áp dụng, nếu đã nhắc trước đó thì hạn chế nhắc lại
4. Gợi ý các mức giảm giá theo từng cấp độ (ví dụ: giảm 5% cho đơn từ 200k, 10% cho đơn từ 500k) khi phù hợp
5. Nhấn mạnh về thời gian còn lại của khuyến mãi để tạo cảm giác cấp bách (nếu có)
6. Đề xuất các sản phẩm bổ sung có liên quan để tăng giá trị đơn hàng (không áp dụng khi khách hàng đang hỏi về tình trạng đơn hàng)
7. Trả lời ngắn gọn trong 2-4 câu trừ khi cần thiết phải chi tiết hơn
8. Cuối cùng, tạo 3 gợi ý câu hỏi/hành động tiếp theo liên quan đến ngữ cảnh hiện tại mà người dùng có thể muốn hỏi hoặc thực hiện.
9. QUAN TRỌNG: Các gợi ý câu hỏi tiếp theo phải liên quan đến thông tin từ cuộc trò chuyện trước đó, sản phẩm đã đề cập, đơn hàng hoặc giỏ hàng của khách hàng.`

// Thêm hướng dẫn về định dạng trả về mới
const RESPONSE_FORMAT_INSTRUCTIONS = `
LUÔN trả về dữ liệu ở định dạng JSON đã stringify như sau:
"{
  "response": "Câu trả lời của bạn ở đây",
  "nextActions": ["Gợi ý hành động 1", "Gợi ý hành động 2", "Gợi ý hành động 3"],
  "searchQuery": "từ khóa tìm kiếm sản phẩm (nếu phù hợp)"
}"

Với các yêu cầu sau:
1. "response" là câu trả lời chính của bạn cho câu hỏi của khách hàng.
2. "nextActions" là một mảng gồm 3 gợi ý ngắn gọn cho các hành động tiếp theo.
3. "searchQuery" là từ khóa tìm kiếm sản phẩm nếu người dùng đang hỏi về tìm kiếm sản phẩm. Nếu không phải là câu hỏi tìm kiếm sản phẩm, để trống hoặc null.
4. Đảm bảo gợi ý ngắn gọn, rõ ràng và liên quan đến ngữ cảnh cuộc trò chuyện.
5. KHÔNG BAO GIỜ trả lời dưới dạng text đơn thuần - luôn sử dụng định dạng JSON đã stringify như trên.
6. Nếu người dùng hỏi về tìm kiếm sản phẩm hoặc muốn xem sản phẩm, hãy ghi ngắn gọn từ khóa tìm kiếm chính xác vào trường searchQuery.`

const ORDER_KEYWORDS = [
    'đơn hàng', 'tình trạng đơn', 'trạng thái đơn', 'theo dõi đơn',
    'giao hàng', 'vận chuyển', 'trạng thái giao hàng', 'đã đặt',
    'mua hàng', 'đặt hàng', 'gói hàng', 'thanh toán', 'đã thanh toán',
    'hủy đơn', 'đơn của tôi', 'đơn mua'
];
const CART_KEYWORDS = [
    'giỏ hàng', 'giỏ mua sắm', 'giỏ hàng của tôi', 'thanh toán',
];
const FIND_PRODUCT_KEYWORDS = [
    'tìm sản phẩm', 'sản phẩm', 'mặt hàng', 'hàng hóa', 'tìm', 'muốn tìm', 'tìm kiếm', 'muốn xem', 'xem sản phẩm',
    'tìm kiếm sản phẩm', 'tìm kiếm mặt hàng', 'tìm kiếm hàng hóa', 'tìm kiếm giỏ hàng', 'tìm kiếm đơn hàng',
    'muốn mua', 'muốn xem sản phẩm', 'muốn tìm sản phẩm', 'tìm kiếm sản phẩm nào đó',
];

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

    async getUserOrders(userId, limit = 5) {
        try {
            if (!userId) return [];

            // Get the user's recent orders
            const orders = await Order.find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('items.productId', 'name')
                .populate('paymentMethod', 'name')
                .populate('deliveryMethod', 'name')
                .lean();

            if (!orders || orders.length === 0) {
                return [];
            }

            // Format orders for chatbot context
            return orders.map(order => ({
                orderId: order._id.toString(),
                date: new Date(order.createdAt).toLocaleDateString('vi-VN'),
                totalPrice: order.totalPrice.toLocaleString('vi-VN') + ' VND',
                deliveryStatus: this.translateDeliveryStatus(order.deliveryStatus),
                paymentStatus: order.paymentStatus === 'success' ? 'Đã thanh toán' : 'Chờ thanh toán',
                products: order.items.map(item => item.productId?.name || 'Sản phẩm').join(', ')
            }));
        } catch (error) {
            console.error('Lỗi khi lấy đơn hàng của người dùng:', error);
            return [];
        }
    }

    translateDeliveryStatus(status) {
        const statusMap = {
            'pending': 'Chờ xác nhận',
            'preparing': 'Đang chuẩn bị hàng',
            'delivering': 'Đang giao hàng',
            'delivered': 'Đã giao hàng',
            'success': 'Hoàn thành',
            'canceled': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    async getUserCart(userId) {
        try {
            if (!userId) return null;

            // Get user's cart
            const cartData = await CartService.getCart(userId);

            if (!cartData || !cartData.data || cartData.status !== "success") {
                return null;
            }

            // Format cart data for chatbot context
            const cartSummary = {
                totalAmount: cartData.data.totalAmount,
                totalSelectedAmount: cartData.data.totalSelectedAmount,
                itemCount: 0,
                selectedItemCount: 0,
                items: []
            };

            // Process each shop's products
            if (cartData.data.shops && cartData.data.shops.length > 0) {
                cartData.data.shops.forEach(shop => {
                    shop.products.forEach(product => {
                        cartSummary.itemCount += 1;
                        if (product.isSelected) {
                            cartSummary.selectedItemCount += 1;
                        }

                        cartSummary.items.push({
                            name: product.name,
                            quantity: product.quantity,
                            price: product.priceAfterSale,
                            totalPrice: product.totalPrice,
                            isSelected: product.isSelected
                        });
                    });
                });
            }

            return cartSummary;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin giỏ hàng của người dùng:', error);
            return null;
        }
    }

    async getUserCart(userId) {
        try {
            if (!userId) return null;

            // Get user's cart
            const cartData = await CartService.getCart(userId);

            if (!cartData || !cartData.data || cartData.status !== "success") {
                return null;
            }

            // Format cart data for chatbot context
            const cartSummary = {
                totalAmount: cartData.data.totalAmount,
                totalSelectedAmount: cartData.data.totalSelectedAmount,
                itemCount: 0,
                selectedItemCount: 0,
                items: []
            };

            // Process each shop's products
            if (cartData.data.shops && cartData.data.shops.length > 0) {
                cartData.data.shops.forEach(shop => {
                    shop.products.forEach(product => {
                        cartSummary.itemCount += 1;
                        if (product.isSelected) {
                            cartSummary.selectedItemCount += 1;
                        }

                        cartSummary.items.push({
                            name: product.name,
                            quantity: product.quantity,
                            price: product.priceAfterSale,
                            totalPrice: product.totalPrice,
                            isSelected: product.isSelected
                        });
                    });
                });
            }

            return cartSummary;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin giỏ hàng của người dùng:', error);
            return null;
        }
    }

    async ask(message, productInfo = null, userId = null) {
        try {
            let contextMessages = [];
            let userContext = null;
            let userOrders = [];
            let userCart = null;
            let isOrderQuery = false;
            let isCartQuery = false;
            let isFindProductQuery = false;

            isOrderQuery = ORDER_KEYWORDS.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
            isCartQuery = CART_KEYWORDS.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
            isFindProductQuery = FIND_PRODUCT_KEYWORDS.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));

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

                // If this appears to be an order-related query, get the user's orders
                if (isOrderQuery) {
                    userOrders = await this.getUserOrders(userId);
                }

                // Get user cart information
                if (isCartQuery || productInfo) {
                    userCart = await this.getUserCart(userId);
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

            // Add order information if this is an order-related query
            if (isOrderQuery && userOrders && userOrders.length > 0) {
                prompt += `Thông tin về các đơn hàng gần đây của khách hàng:\n`;
                userOrders.forEach((order, index) => {
                    prompt += `Đơn hàng #${index + 1} (${order.orderId}):\n`;
                    prompt += `- Ngày đặt: ${order.date}\n`;
                    prompt += `- Sản phẩm: ${order.products}\n`;
                    prompt += `- Tổng tiền: ${order.totalPrice}\n`;
                    prompt += `- Trạng thái đơn hàng: ${order.deliveryStatus}\n`;
                    prompt += `- Trạng thái thanh toán: ${order.paymentStatus}\n\n`;
                });
            } else if (isOrderQuery && (!userOrders || userOrders.length === 0)) {
                prompt += `Khách hàng chưa có đơn hàng nào.\n\n`;
            }

            // Add cart information if available
            if (userCart) {
                prompt += `Thông tin giỏ hàng hiện tại của khách hàng:\n`;
                prompt += `- Tổng giá trị: ${userCart.totalAmount.toLocaleString('vi-VN')} VND\n`;
                prompt += `- Số lượng sản phẩm: ${userCart.itemCount}\n`;
                prompt += `- Số lượng sản phẩm đã chọn: ${userCart.selectedItemCount}\n`;

                if (userCart.items.length > 0) {
                    prompt += `- Sản phẩm trong giỏ:\n`;
                    userCart.items.slice(0, 5).forEach((item, index) => {
                        prompt += `  + ${item.name} (${item.quantity} cái, ${item.totalPrice.toLocaleString('vi-VN')} VND)${item.isSelected ? ' - Đã chọn' : ''}\n`;
                    });
                    if (userCart.items.length > 5) {
                        prompt += `  + ... và ${userCart.items.length - 5} sản phẩm khác\n`;
                    }
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

            // Nếu là truy vấn tìm kiếm sản phẩm, thêm thông tin vào prompt
            if (isFindProductQuery) {
                prompt += `\nĐây là yêu cầu tìm kiếm sản phẩm. Vui lòng trích xuất từ khóa tìm kiếm chính xác và cung cấp trong trường searchQuery.\n`;
            }

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${userContext.gender === 'male' ? 'anh' : (userContext.gender === 'female' ? 'chị' : 'bạn')}" nếu phù hợp. `;
            }
            prompt += RESPONSE_INSTRUCTIONS + "\n\n";
            prompt += RESPONSE_FORMAT_INSTRUCTIONS + "\n\n";

            console.log('Prompt:', prompt);

            const timeout = 10000; // 10 giây
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout);
            });

            const responsePromise = this.model.generateContent(prompt);
            const result = await Promise.race([responsePromise, timeoutPromise]);
            let responseText = await result.response.text();
            /**
            '```json\n{\n  "response": "Dạ, em chào anh Tú ạ! 😊 Anh có cần em giúp gì không ạ? Chắc anh đang tìm món đồ gì đó đúng không? Để em gợi ý vài món đang hot hit trên Phố Mua Sắm mình nha!",\n  "nextActions": [\n    "Xem các sản phẩm đang được yêu thích nhất",\n    "Tìm kiếm một sản phẩm cụ thể",\n    "Xem lại giỏ hàng của tôi"\n  ]\n}\n```'
             */
            responseText = responseText
                .replace(/```json\s*/, '')
                .replace(/```\s*$/, '');

            // Parse the JSON response
            try {
                // Try to parse as JSON first
                const responseJson = JSON.parse(responseText);
                return responseJson;
            } catch (e) {
                // If parsing fails, wrap the plain text in our format
                console.warn('Không thể parse JSON từ Gemini, sẽ convert sang định dạng object:', e);
                return {
                    response: responseText,
                    nextActions: [
                        "Bạn muốn biết thêm thông tin gì không?",
                        "Bạn có cần tư vấn sản phẩm nào khác không?",
                        "Bạn có muốn xem giỏ hàng của mình không?"
                    ],
                    searchQuery: null
                };
            }
        } catch (error) {
            console.error('Lỗi gọi Gemini API:', error);
            return {
                response: `Xin lỗi, mình gặp lỗi khi xử lý: ${error.message}`,
                nextActions: [
                    "Thử hỏi câu khác",
                    "Xem sản phẩm khuyến mãi",
                    "Xem đơn hàng của tôi"
                ],
                searchQuery: null
            };
        }
    } async consultProduct(productIds, question, userId = null) {
        try {
            // Check if the question is related to order status
            const isOrderQuery = ORDER_KEYWORDS.some(keyword => question.toLowerCase().includes(keyword.toLowerCase()));
            const isCartQuery = CART_KEYWORDS.some(keyword => question.toLowerCase().includes(keyword.toLowerCase()));
            const isFindProductQuery = FIND_PRODUCT_KEYWORDS.some(keyword => question.toLowerCase().includes(keyword.toLowerCase()));

            // If it's an order query and we have a userId, respond with order information instead
            if (isOrderQuery && userId) {
                return this.handleOrderQuery(question, userId);
            }

            const products = await Product.find({
                _id: { $in: productIds },
            }).populate('seller', 'shopName').exec();

            if (products.length === 0) {
                return {
                    response: "Xin lỗi, không tìm thấy sản phẩm nào với ID bạn cung cấp!",
                    nextActions: [
                        "Tìm sản phẩm khác",
                        "Xem sản phẩm khuyến mãi",
                        "Xem danh mục sản phẩm"
                    ]
                };
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
            let userCart = null;

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

                // Get user cart information
                userCart = await this.getUserCart(userId);
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

            // Add cart information if available
            if (userCart) {
                prompt += `Thông tin giỏ hàng hiện tại của khách hàng:\n`;
                prompt += `- Tổng giá trị: ${userCart.totalAmount.toLocaleString('vi-VN')} VND\n`;
                prompt += `- Số lượng sản phẩm: ${userCart.itemCount}\n`;
                prompt += `- Số lượng sản phẩm đã chọn: ${userCart.selectedItemCount}\n`;

                if (userCart.items.length > 0) {
                    prompt += `- Sản phẩm trong giỏ:\n`;
                    userCart.items.slice(0, 5).forEach((item, index) => {
                        prompt += `  + ${item.name} (${item.quantity} cái, ${item.totalPrice.toLocaleString('vi-VN')} VND)${item.isSelected ? ' - Đã chọn' : ''}\n`;
                    });
                    if (userCart.items.length > 5) {
                        prompt += `  + ... và ${userCart.items.length - 5} sản phẩm khác\n`;
                    }
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
            prompt += `Thông tin chi tiết sản phẩm (đã bao gồm giá giảm và khuyến mãi):\n${productInfo}\n\n`;            // Bổ sung gợi ý về cách giới thiệu khuyến mãi
            prompt += `Hãy nhớ nhắc khách hàng về các ưu đãi đang có. Khuyến khích khách hàng sử dụng mã giảm giá nếu phù hợp.\n\n`;

            // Nếu là truy vấn tìm kiếm sản phẩm, thêm thông tin vào prompt
            if (isFindProductQuery) {
                prompt += `\nĐây là yêu cầu tìm kiếm sản phẩm. Vui lòng trích xuất từ khóa tìm kiếm chính xác và cung cấp trong trường searchQuery.\n`;
            }

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${userContext.gender === 'male' ? 'anh' : (userContext.gender === 'female' ? 'chị' : 'bạn')}" nếu phù hợp. `;
            }
            prompt += RESPONSE_INSTRUCTIONS + "\n\n";
            prompt += RESPONSE_FORMAT_INSTRUCTIONS + "\n\n";

            console.log('Prompt:', prompt);

            const timeout = 10000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout);
            });

            const responsePromise = this.model.generateContent(prompt);
            const result = await Promise.race([responsePromise, timeoutPromise]);
            let responseText = await result.response.text();

            responseText = responseText
                .replace(/```json\s*/, '')
                .replace(/```\s*$/, '');

            // Parse the JSON response
            try {
                // Try to parse as JSON first
                const responseJson = JSON.parse(responseText);
                return responseJson;
            } catch (e) {
                // If parsing fails, wrap the plain text in our format
                console.warn('Không thể parse JSON từ Gemini, sẽ convert sang định dạng object:', e);
                return {
                    response: responseText,
                    nextActions: [
                        `Thông tin chi tiết về ${products[0].name}`,
                        "Có màu sắc/kích thước nào khác không?",
                        "Thêm vào giỏ hàng"
                    ],
                    searchQuery: null
                };
            }
        } catch (error) {
            console.error('Lỗi tư vấn sản phẩm:', error);
            return {
                response: `Xin lỗi, mình gặp lỗi khi tư vấn: ${error.message}`,
                nextActions: [
                    "Hỏi về sản phẩm khác",
                    "Xem sản phẩm tương tự",
                    "Quay lại trang chủ"
                ],
                searchQuery: null
            };
        }
    } async handleOrderQuery(question, userId) {
        try {
            // Get user's recent orders
            const userOrders = await this.getUserOrders(userId);
            const userContext = await this.getUserContext(userId);
            const userCart = await this.getUserCart(userId);
            let prompt = "";

            // System instruction part
            prompt += SYSTEM_INSTRUCTIONS + "\n\n";

            // User context part
            if (userContext) {
                prompt += `Thông tin về khách hàng:\n`;
                prompt += `- Tên: ${userContext.name}\n`;
                prompt += `- Giới tính: ${userContext.gender}\n`;
                prompt += '\n';
            }

            // Add order information
            if (userOrders && userOrders.length > 0) {
                prompt += `Thông tin về các đơn hàng gần đây của khách hàng:\n`;
                userOrders.forEach((order, index) => {
                    prompt += `Đơn hàng #${index + 1} (${order.orderId}):\n`;
                    prompt += `- Ngày đặt: ${order.date}\n`;
                    prompt += `- Sản phẩm: ${order.products}\n`;
                    prompt += `- Tổng tiền: ${order.totalPrice}\n`;
                    prompt += `- Trạng thái đơn hàng: ${order.deliveryStatus}\n`;
                    prompt += `- Trạng thái thanh toán: ${order.paymentStatus}\n\n`;
                });
            } else {
                prompt += `Khách hàng chưa có đơn hàng nào.\n\n`;
            }

            // Add cart information if available
            if (userCart) {
                prompt += `Thông tin giỏ hàng hiện tại của khách hàng:\n`;
                prompt += `- Tổng giá trị: ${userCart.totalAmount.toLocaleString('vi-VN')} VND\n`;
                prompt += `- Số lượng sản phẩm: ${userCart.itemCount}\n`;

                if (userCart.items.length > 0) {
                    prompt += `- Sản phẩm trong giỏ: ${userCart.items.slice(0, 3).map(item => item.name).join(', ')}\n`;
                    if (userCart.items.length > 3) {
                        prompt += `  và ${userCart.items.length - 3} sản phẩm khác\n`;
                    }
                }
                prompt += '\n';
            }

            prompt += `Khách hàng hỏi về đơn hàng: '${question}'.\n\n`;

            // Response instructions
            if (userContext) {
                prompt += `Hãy gọi khách hàng là "${userContext.gender === 'male' ? 'anh' : (userContext.gender === 'female' ? 'chị' : 'bạn')}" nếu phù hợp. `;
            }
            prompt += RESPONSE_INSTRUCTIONS + "\n\n";
            prompt += RESPONSE_FORMAT_INSTRUCTIONS + "\n\n";

            console.log('Prompt for order query:', prompt);

            const timeout = 10000;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Gemini API phản hồi quá lâu')), timeout);
            });

            const responsePromise = this.model.generateContent(prompt);
            const result = await Promise.race([responsePromise, timeoutPromise]);
            let responseText = await result.response.text();

            responseText = responseText
                .replace(/```json\s*/, '')
                .replace(/```\s*$/, '');

            // Parse the JSON response
            try {
                // Try to parse as JSON first
                const responseJson = JSON.parse(responseText);
                return responseJson;
            } catch (e) {
                // If parsing fails, wrap the plain text in our format
                console.warn('Không thể parse JSON từ Gemini, sẽ convert sang định dạng object:', e); return {
                    response: responseText,
                    nextActions: [
                        "Kiểm tra trạng thái đơn hàng mới nhất",
                        "Cần hỗ trợ thêm về đơn hàng",
                        "Xem các sản phẩm tương tự"
                    ],
                    searchQuery: null
                };
            }
        } catch (error) {
            console.error('Lỗi khi xử lý truy vấn đơn hàng:', error);
            return {
                response: "Xin lỗi, mình gặp lỗi khi kiểm tra thông tin đơn hàng. Vui lòng thử lại sau!",
                nextActions: [
                    "Thử lại sau",
                    "Xem sản phẩm mới",
                    "Liên hệ bộ phận hỗ trợ"
                ],
                searchQuery: null
            };
        }
    } async saveChatInteraction(userId, endpoint, userInput, botResponse) {
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

            console.log(userId, endpoint, userInput, botResponse);

            // Lưu câu hỏi của người dùng
            const userMessage = new Message({
                conversationId: conversation._id,
                sender: userId,
                content: userInput.question || userInput.message,
                isDelivered: true,
            });
            await userMessage.save();

            // Xử lý dữ liệu botResponse có thể ở định dạng cũ hoặc mới
            let botMessageContent, nextActions = [];

            if (typeof botResponse.response === 'string') {
                // Định dạng mới (có response và có thể có nextActions)
                botMessageContent = botResponse.response;
                nextActions = botResponse.nextActions || [];
            } else {
                // Định dạng cũ - cả botResponse là chuỗi hoặc có dạng cũ
                botMessageContent = endpoint === 'chat' && botResponse.productIds && botResponse.productIds.length > 0
                    ? `${botResponse.response || botResponse}`
                    : botResponse.response || botResponse;
            }

            // Lưu câu trả lời của chatbot với metadata bổ sung
            const botMessage = new Message({
                conversationId: conversation._id,
                sender: this.chatbotId,
                content: botMessageContent,
                isDelivered: true,
                productIds: botResponse.productIds || [], // Lưu danh sách ID sản phẩm liên quan
                metadata: {
                    nextActions: nextActions // Lưu các gợi ý hành động tiếp theo
                }
            });
            await botMessage.save();

            console.log('Đã lưu tương tác chatbot!');
        } catch (error) {
            console.error('Lỗi lưu tương tác:', error);
        }
    } async getChatHistory(userId) {
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

