const GeminiService = require("../services/GeminiService");

class GeminiController {
    // async getAnswer(req, res) {
    //     try {
    //         const { question } = req.body;

    //         if (!question) {
    //             return res.status(400).json({ error: "Vui lòng nhập câu hỏi." });
    //         }

    //         const answer = await GeminiService.ask(question);
    //         return res.json({ question, answer });
    //     } catch (error) {
    //         return res.status(500).json({ error: error.message });
    //     }
    // }

    async getAnswer(req, res) {
        try {
            const { question } = req.body;
            const userId = req.id; 
            if (!userId) {
                return res.status(400).json({ response: 'Vui lòng cung cấp userId!', productIds: [] });
            }
            if (!question || question.trim() === '') {
                const botResponse = { response: 'Bạn chưa nhập gì cả, hãy thử lại nhé!', productIds: [] };
                await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse);
                return res.status(400).json(botResponse);
            }

            const products = await GeminiService.searchProducts(question);
            let response;
            let productIds = [];

            if (products.length > 0) {
                const productInfo = products
                    .map((p) => `- ${p.name}: ${p.priceAfterSale} VND, còn ${p.inStock} hàng`)
                    .join('\n');
                response = await GeminiService.ask(question, productInfo);
                productIds = products.map((p) => p._id.toString());
            } else {
                response = await GeminiService.ask(question);
            }

            const botResponse = { response, productIds };

            console.log('userId: ', userId, 'question:', question)

            await GeminiService.saveChatInteraction(userId, 'chat', { question }, botResponse);
            return res.json(botResponse);
        } catch (error) {
            console.error('Lỗi trong GeminiController:', error);
            const botResponse = { response: 'Xin lỗi, có lỗi xảy ra!', productIds: [] };
            await GeminiService.saveChatInteraction(req.body.userId || 'unknown', 'chat', { question: req.body.question }, botResponse);
            return res.status(500).json(botResponse);
        }
    }

    async consultProduct(req, res) {
        try {
            const { productIds, question } = req.body;
            const userId = req.id; 
            if (!userId) {
                return res.status(400).json({ response: 'Vui lòng cung cấp userId!' });
            }
            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                const botResponse = { response: 'Vui lòng cung cấp ít nhất một ID sản phẩm!' };
                await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
                return res.status(400).json(botResponse);
            }
            if (!question || question.trim() === '') {
                const botResponse = { response: 'Vui lòng nhập câu hỏi!' };
                await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
                return res.status(400).json(botResponse);
            }

            const response = await GeminiService.consultProduct(productIds, question);
            const botResponse = { response };
            await GeminiService.saveChatInteraction(userId, 'consult', { productIds, question }, botResponse);
            return res.json(botResponse);
        } catch (error) {
            console.error('Lỗi trong consultProduct:', error);
            const botResponse = { response: 'Xin lỗi, có lỗi xảy ra!' };
            await GeminiService.saveChatInteraction(req.body.userId || 'unknown', 'consult', { productIds: req.body.productIds, question: req.body.question }, botResponse);
            return res.status(500).json(botResponse);
        }
    }

    async getChatHistory(req, res) {
        try {
            const userId  = req.id;

            if (!userId) {
                return res.status(400).json({ messages: [], error: 'Vui lòng cung cấp userId!' });
            }

            const messages = await GeminiService.getChatHistory(userId);
            return res.json({ messages });
        } catch (error) {
            console.error('Lỗi trong getChatHistory:', error);
            return res.status(500).json({ messages: [], error: 'Xin lỗi, không thể lấy lịch sử trò chuyện!' });
        }
    }
}

module.exports = new GeminiController();

