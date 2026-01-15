const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticateToken, requireRole } = require('../middlewares/auth.middleware');
const { transactionLimiter } = require('../middlewares/rateLimiter.middleware');

// Public routes (no auth required)
router.post('/login', studentController.studentLogin);  // Student login with ID + PIN

// Protected routes
router.use(authenticateToken);

// Guardian operations
router.post('/', studentController.createStudent);                              // Create student
router.get('/', studentController.getMyStudents);                               // List my students
router.patch('/:studentId/pin', studentController.updateStudentPin);            // Update PIN
router.patch('/:studentId/status', studentController.updateStudentStatus);      // Block/Unblock
router.post('/transfer', transactionLimiter, studentController.transferToStudent);  // Transfer money
router.get('/:studentId/transactions', studentController.getStudentTransactions);  // Transaction history
router.put('/:studentId/limit', studentController.setSpendingLimit);               // Set daily spending limit
router.get('/:studentId/limit', studentController.getSpendingLimit);               // Get spending limit info

// Admin operations
router.get('/all', requireRole('ADMIN'), studentController.getAllStudents);

// Student device/OTP operations (for biometric auth)
router.post('/device/register', studentController.registerDevice);    // Register device for biometrics
router.get('/device/verify', studentController.verifyDevice);         // Verify device registration
router.post('/generate-otp', studentController.generateOTP);          // Generate payment OTP

module.exports = router;
