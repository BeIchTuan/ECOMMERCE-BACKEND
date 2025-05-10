const GeminiService = require("../services/GeminiService");

class GeminiController {
    async getAnswer(req, res) {
        try {
            const { question } = req.body;
            const userId = req.id; if (!userId) {
                return res.status(400).json({
                    response: 'Vui lòng cung cấp userId!',
                    nextActions: ["Đăng nhập", "Đăng ký"],
                    productIds: [],
                    productDetails: [],
                    searchQuery: null
                });
            } 
            
            if (!question || question.trim() === '') {
                const botResponse = {
                    response: 'Bạn chưa nhập gì cả, hãy thử lại nhé!',
                    nextActions: ["Tôi cần tư vấn sản phẩm", "Xem đơn hàng của tôi", "Xem giỏ hàng của tôi"],
                    productIds: [],
                    productDetails: [],
                    searchQuery: null
                };
                await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse);
                return res.status(400).json(botResponse);
            } 
            
            const products = await GeminiService.searchProducts(question);
            let responseData;
            let productIds = [];
            let productDetails = [];

            if (products.length > 0) {
                const productInfo = products
                    .map((p) => `- ${p.name}: ${p.priceAfterSale} VND, còn ${p.inStock} hàng`)
                    .join('\n');
                // Pass userId to include previous messages as context
                responseData = await GeminiService.ask(question, productInfo, userId);
                productIds = products.map((p) => p._id.toString());

                // Extract essential product details
                productDetails = products.map(p => ({
                    id: p._id.toString(),
                    name: p.name,
                    thumbnail: p.thumbnail,
                    price: p.price,
                    priceAfterSale: p.priceAfterSale
                }));
            } else {
                // Pass userId to include previous messages as context
                responseData = await GeminiService.ask(question, null, userId);

                // Nếu có từ khóa tìm kiếm và không có sản phẩm nào được tìm thấy trước đó
                if (responseData.searchQuery && responseData.searchQuery.trim() !== '') {
                    const searchQuery = responseData.searchQuery.trim();
                    // Tìm kiếm sản phẩm dựa trên searchQuery từ Gemini
                    const searchedProducts = await GeminiService.searchProducts(searchQuery);

                    if (searchedProducts.length > 0) {
                        productIds = searchedProducts.map((p) => p._id.toString());

                        // Extract essential product details
                        productDetails = searchedProducts.map(p => ({
                            id: p._id.toString(),
                            name: p.name,
                            thumbnail: p.thumbnail,
                            price: p.price,
                            priceAfterSale: p.priceAfterSale
                        }));

                        console.log(`Đã tìm thấy ${searchedProducts.length} sản phẩm với từ khóa "${searchQuery}"`);
                    }
                }
            } const botResponse = {
                response: responseData.response,
                nextActions: responseData.nextActions || [],
                productIds,
                productDetails,
                searchQuery: responseData.searchQuery || null
            };

            console.log('userId: ', userId, 'question:', question, 'searchQuery:', responseData.searchQuery || null)

            await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse);

            return res.json({
                response: botResponse.response,
                nextActions: botResponse.nextActions,
                productDetails: botResponse.productDetails,
                searchQuery: botResponse.searchQuery
            });
        } catch (error) {
            console.error('Lỗi trong GeminiController:', error);
            const botResponse = {
                response: 'Xin lỗi, có lỗi xảy ra!',
                productIds: [],
                productDetails: [],
                searchQuery: null
            };
            await GeminiService.saveChatInteraction(req.body.userId || 'unknown', 'chat', { question: req.body.question }, botResponse);
            return res.status(500).json(botResponse);
        }
    } 
    
    async consultProduct(req, res) {
        try {
            const { productIds, question } = req.body;
            const userId = req.id; if (!userId) {
                return res.status(400).json({
                    response: 'Vui lòng cung cấp userId!',
                    nextActions: ["Đăng nhập", "Đăng ký", "Xem sản phẩm mới"],
                    searchQuery: null
                });
            } if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                const botResponse = {
                    response: 'Vui lòng cung cấp ít nhất một ID sản phẩm!',
                    nextActions: ["Tìm sản phẩm", "Xem danh mục", "Xem sản phẩm nổi bật"],
                    searchQuery: null
                };
                await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
                return res.status(400).json(botResponse);
            } if (!question || question.trim() === '') {
                const botResponse = {
                    response: 'Vui lòng nhập câu hỏi!',
                    nextActions: ["Sản phẩm này có khuyến mãi gì?", "Sản phẩm này có những ưu điểm gì?", "So sánh với sản phẩm tương tự"],
                    searchQuery: null
                };
                await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
                return res.status(400).json(botResponse);
            }

            // Pass userId to include previous messages as context
            const responseData = await GeminiService.consultProduct(productIds, question, userId); const botResponse = {
                response: responseData.response,
                nextActions: responseData.nextActions || [],
                searchQuery: responseData.searchQuery || null
            };

            await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
            return res.json(botResponse);
        } catch (error) {
            console.error('Lỗi trong consultProduct:', error); const botResponse = {
                response: 'Xin lỗi, có lỗi xảy ra!',
                nextActions: ["Thử lại", "Xem sản phẩm khác", "Quay lại trang chủ"],
                searchQuery: null
            };
            await GeminiService.saveChatInteraction(req.body.userId || 'unknown', 'consult', { productIds: req.body.productIds, question: req.body.question }, botResponse);
            return res.status(500).json(botResponse);
        }
    } 
    
    async getChatHistory(req, res) {
        try {
            const userId = req.id;

            if (!userId) {
                return res.status(400).json({ messages: [], error: 'Vui lòng cung cấp userId!' });
            }

            const messages = await GeminiService.getChatHistory(userId);
            return res.json({
                messages: messages.map(message => ({
                    id: message._id,
                    sender: message.sender,
                    role: message.sender === userId ? 'user' : 'chatbot',
                    content: message.content,
                    timestamp: message.timestamp,
                    isDelivered: message.isDelivered,
                    nextActions: message.nextActions || [], // Thêm gợi ý hành động tiếp theo
                    productDetails: message.productDetails || [], // Danh sách ID sản phẩm liên quan
                }))
            });
        } catch (error) {
            console.error('Lỗi trong getChatHistory:', error);
            return res.status(500).json({ messages: [], error: 'Xin lỗi, không thể lấy lịch sử trò chuyện!' });
        }
    }
}

module.exports = new GeminiController();

