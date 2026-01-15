const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const walletRoutes = require('./routes/wallet.routes');
const studentRoutes = require('./routes/student.routes');  // NEW: Student management by guardians
const vendorRoutes = require('./routes/vendor.routes');
const adminRoutes = require('./routes/admin.routes');
const checklistRoutes = require('./routes/checklist.routes');
const menuRoutes = require('./routes/menu.routes');
const paymentRoutes = require('./routes/payment.routes');

const { apiLimiter } = require('./middlewares/rateLimiter.middleware');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined')); // HTTP request logging
app.use(express.json());
app.use(apiLimiter); // Apply rate limiting to all routes

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/student', studentRoutes);  // NEW: Student management (guardian creates students)
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/menu', menuRoutes);  // Vendor menu management
app.use('/api/payment', paymentRoutes);  // Razorpay payment integration

app.get('/', (req, res) => {
    res.json({ message: 'Guardian Wallet API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;

