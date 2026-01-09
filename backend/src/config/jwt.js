const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role.name, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // 7 days validity
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' } // 30 days validity
    );
};

module.exports = { generateAccessToken, generateRefreshToken };
