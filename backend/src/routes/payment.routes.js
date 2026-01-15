const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');

// Get Razorpay key (public)
router.get('/key', authenticateToken, paymentController.getKey);

// Create order (requires auth)
router.post('/create-order', authenticateToken, paymentController.createOrder);

// Verify payment (requires auth)
router.post('/verify', authenticateToken, paymentController.verifyPayment);

// Get payment history (requires auth)
router.get('/history', authenticateToken, paymentController.getPaymentHistory);

module.exports = router;
