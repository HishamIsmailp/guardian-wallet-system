const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const { registerValidation, loginValidation, uuidParamValidation } = require('../middlewares/validation.middleware');

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);

// Admin Routes
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');
router.get('/users', authenticateToken, requireRole('ADMIN'), authController.getUsers);
router.patch('/users/:id/verify', authenticateToken, requireRole('ADMIN'), uuidParamValidation, authController.verifyUser);

module.exports = router;

