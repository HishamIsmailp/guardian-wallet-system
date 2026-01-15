const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendor.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');
const { transactionLimiter } = require('../middlewares/rateLimiter.middleware');
const { uuidParamValidation } = require('../middlewares/validation.middleware');

router.use(authenticateToken);

// Vendor operations - Main transaction flow
router.post('/transaction', transactionLimiter, vendorController.processTransaction);  // Process payment with student ID + PIN
router.get('/transactions', vendorController.getVendorTransactions);                    // Vendor's transaction history
router.post('/withdrawal', transactionLimiter, vendorController.requestWithdrawal);
router.get('/qr-code', vendorController.generateQRCode);
router.get('/approved', vendorController.getApprovedVendors);

// Admin operations
router.get('/', requireRole('ADMIN'), vendorController.getAllVendors);
router.patch('/:vendorId/approve', requireRole('ADMIN'), vendorController.approveVendor);
router.post('/settlement', requireRole('ADMIN'), vendorController.approveSettlement);

module.exports = router;
