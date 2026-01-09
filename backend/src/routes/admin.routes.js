const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);
router.use(requireRole('ADMIN')); // All admin routes require ADMIN role

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/reports', adminController.generateReport);

module.exports = router;
