const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../utils/db');

// Initialize Razorpay instance
const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials not configured');
    }
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

// Create Razorpay order for adding money to wallet
exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        // Check if Razorpay is configured
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay credentials not configured');
            return res.status(500).json({ error: 'Payment gateway not configured. Please contact admin.' });
        }

        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Amount must be at least ₹1' });
        }

        // Get user's wallet
        const wallet = await prisma.wallet.findFirst({
            where: { userId }
        });
        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found. Please contact support.' });
        }

        // Amount in paise (Razorpay uses smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        const razorpay = getRazorpayInstance();

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `wallet_${userId.substring(0, 8)}_${Date.now()}`,
            notes: {
                userId: userId,
                purpose: 'wallet_recharge'
            }
        };

        console.log('Creating Razorpay order:', options);
        const order = await razorpay.orders.create(options);
        console.log('Razorpay order created:', order.id);

        // Store order in database for verification later (use UUID, store razorpay order ID in description)
        const transaction = await prisma.transaction.create({
            data: {
                amount: amount,
                type: 'DEPOSIT',
                status: 'PENDING',
                description: `Razorpay Order: ${order.id}`,
                initiatedByUserId: userId,
                toWalletId: wallet.id
            }
        });

        res.json({
            orderId: order.id,
            transactionId: transaction.id,
            amount: amount,
            amountInPaise: amountInPaise,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Create order error:', error.message, error.stack);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
};

// Verify payment and update wallet
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const userId = req.user.id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Find transaction by Razorpay order ID stored in description
        const transaction = await prisma.transaction.findFirst({
            where: {
                description: {
                    contains: razorpay_order_id
                },
                type: 'DEPOSIT',
                status: 'PENDING'
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (expectedSignature !== razorpay_signature) {
            // Update transaction as failed
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    description: `Payment verification failed - Invalid signature (Order: ${razorpay_order_id})`
                }
            }).catch(() => {});

            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        if (transaction.status === 'COMPLETED') {
            return res.status(400).json({ error: 'Payment already processed' });
        }

        // Get user's wallet
        const wallet = await prisma.wallet.findFirst({
            where: { userId }
        });

        if (!wallet) {
            return res.status(404).json({ error: 'Wallet not found' });
        }

        // Update wallet balance and transaction status
        const [updatedWallet, updatedTransaction] = await prisma.$transaction([
            prisma.wallet.update({
                where: { id: wallet.id },
                data: {
                    balance: {
                        increment: transaction.amount
                    }
                }
            }),
            prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'COMPLETED',
                    description: `Wallet recharge - Payment ${razorpay_payment_id} (Order: ${razorpay_order_id})`
                }
            })
        ]);

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'WALLET_RECHARGE',
                userId: userId,
                details: JSON.stringify({
                    amount: transaction.amount,
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id
                })
            }
        }).catch(() => {});

        res.json({
            success: true,
            message: 'Payment verified and wallet updated',
            newBalance: parseFloat(updatedWallet.balance),
            amount: parseFloat(transaction.amount),
            transactionId: updatedTransaction.id
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// Get Razorpay key for frontend
exports.getKey = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID) {
            return res.status(500).json({ error: 'Razorpay not configured' });
        }
        res.json({ keyId: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get key' });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const deposits = await prisma.transaction.findMany({
            where: {
                initiatedByUserId: userId,
                type: 'DEPOSIT'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 20
        });

        res.json(deposits);
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
};
