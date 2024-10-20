const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')

dotenv.config()

// Middleware xác thực và phân quyền
const authMiddleware = (allowedRoles = []) => {
    return async (req, res, next) => {
        const accessToken = req.cookies?.accessToken;

        if (!accessToken) {
            return res.status(409).json({ error: 'Please Login First' });
        } else {
            try {
                // Giải mã token
                const deCodeToken = await jwt.verify(accessToken, process.env.ACCESS_TOKEN);

                //console.log('Decoded Token:', deCodeToken);

                // Lưu thông tin người dùng vào request
                req.role = deCodeToken.role;
                req.id = deCodeToken.id;

                // Kiểm tra xem role của user có được phép truy cập không
                if (allowedRoles.length && !allowedRoles.includes(req.role)) {
                    return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
                }

                next();
            } catch (error) {
                return res.status(409).json({ error: 'Please Login' });
            }
        }
    };
};

module.exports = {
    authMiddleware
}
