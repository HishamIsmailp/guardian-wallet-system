const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { transactionLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    addMoneyValidation,
    payVendorValidation,
    transferMoneyValidation,
    walletRuleValidation
} = require('../middlewares/validation.middleware');

router.use(authenticateToken); // All routes require auth

router.post('/add-money', transactionLimiter, addMoneyValidation, walletController.addMoney);
// NOTE: /transfer and /pay removed - Use /api/student/transfer and /api/vendor/transaction instead
router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.get('/transactions/all', walletController.getAllTransactions);
router.post('/rules', walletRuleValidation, walletController.setWalletRule);
router.get('/rules', walletController.getWalletRule);

module.exports = router;

