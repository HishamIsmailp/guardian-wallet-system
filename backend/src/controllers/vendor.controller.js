const bcrypt = require('bcrypt');
const prisma = require('../utils/db');
const { createAuditLog } = require('../utils/auditLog');
const QRCode = require('qrcode');
const { validateOTP } = require('./student.controller');

// Vendor processes payment using Student ID + PIN or OTP
// This is the main transaction flow - vendor initiates payment
// Supports item-based billing with 'items' array
exports.processTransaction = async (req, res) => {
    try {
        const { studentId, pin, otp, amount, description, items } = req.body;
        const vendorUserId = req.user.id;

        if (req.user.role !== 'VENDOR') {
            return res.status(403).json({ error: 'Only Vendors can process transactions' });
        }

        // Calculate total from items if provided, otherwise use amount
        let finalAmount = parseFloat(amount) || 0;
        let itemDetails = [];

        if (items && Array.isArray(items) && items.length > 0) {
            // Calculate total from items
            finalAmount = items.reduce((sum, item) => {
                const itemTotal = parseFloat(item.price) * (parseInt(item.quantity) || 1);
                itemDetails.push({
                    menuItemId: item.id || null,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity) || 1
                });
                return sum + itemTotal;
            }, 0);
        }

        // Validate input - need either PIN or OTP
        if (!studentId || (!pin && !otp) || finalAmount <= 0) {
            return res.status(400).json({ error: 'Student ID, PIN/OTP, and amount/items are required' });
        }

        // Find vendor profile and verify approved
        const vendorProfile = await prisma.vendor.findFirst({ where: { userId: vendorUserId } });
        if (!vendorProfile || !vendorProfile.approved) {
            return res.status(403).json({ error: 'Vendor not approved. Contact admin.' });
        }

        // Find student by studentId (college ID)
        const student = await prisma.student.findUnique({ where: { studentId } });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check student status
        if (student.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Student account is blocked' });
        }

        // Verify authentication - either PIN or OTP
        let authValid = false;
        let authMethod = '';

        if (otp) {
            // Verify OTP (from biometric authentication)
            const otpResult = validateOTP(studentId, otp);
            if (!otpResult.valid) {
                await createAuditLog('FAILED_OTP_ATTEMPT', vendorUserId, 'STUDENT', student.id, { studentId, error: otpResult.error }, req.ip);
                return res.status(401).json({ error: otpResult.error || 'Invalid or expired OTP' });
            }
            authValid = true;
            authMethod = 'OTP';
        } else if (pin) {
            // Verify PIN
            const pinValid = await bcrypt.compare(pin, student.pinHash);
            if (!pinValid) {
                await createAuditLog('FAILED_PIN_ATTEMPT', vendorUserId, 'STUDENT', student.id, { studentId }, req.ip);
                return res.status(401).json({ error: 'Invalid PIN' });
            }
            authValid = true;
            authMethod = 'PIN';
        }

        if (!authValid) {
            return res.status(401).json({ error: 'Authentication failed' });
        }

        // Get student wallet
        const studentWallet = await prisma.wallet.findFirst({
            where: { studentId: student.id, type: 'STUDENT' }
        });
        if (!studentWallet) {
            return res.status(404).json({ error: 'Student wallet not found' });
        }

        // Check balance
        if (parseFloat(studentWallet.balance) < finalAmount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Check daily limit if rule exists
        const rules = await prisma.walletRule.findFirst({
            where: { walletId: studentWallet.id, active: true }
        });

        if (rules && rules.dailyLimit) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const transactions = await prisma.transaction.findMany({
                where: { fromWalletId: studentWallet.id, type: 'PAYMENT' }
            });

            const todayTransactions = transactions.filter(t =>
                new Date(t.createdAt) >= today
            );

            const spentToday = todayTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

            if (spentToday + finalAmount > parseFloat(rules.dailyLimit)) {
                return res.status(400).json({
                    error: 'Daily spending limit exceeded',
                    dailyLimit: parseFloat(rules.dailyLimit),
                    spentToday: spentToday
                });
            }
        }

        // Get vendor wallet
        const vendorWallet = await prisma.wallet.findFirst({
            where: { userId: vendorUserId, type: 'VENDOR' }
        });
        if (!vendorWallet) {
            return res.status(404).json({ error: 'Vendor wallet not found' });
        }

        // Generate description from items if present
        let txDescription = description;
        if (!txDescription && itemDetails.length > 0) {
            txDescription = itemDetails.map(i => `${i.name} x${i.quantity}`).join(', ');
        }
        txDescription = txDescription || `Payment at ${vendorProfile.storeName}`;

        // Process atomic transaction
        const result = await prisma.$transaction([
            // Deduct from student
            prisma.wallet.update({
                where: { id: studentWallet.id },
                data: { balance: { decrement: finalAmount } }
            }),
            // Add to vendor
            prisma.wallet.update({
                where: { id: vendorWallet.id },
                data: { balance: { increment: finalAmount } }
            }),
            // Create transaction record
            prisma.transaction.create({
                data: {
                    fromWalletId: studentWallet.id,
                    toWalletId: vendorWallet.id,
                    amount: finalAmount,
                    type: 'PAYMENT',
                    status: 'COMPLETED',
                    initiatedByUserId: vendorUserId,
                    description: txDescription
                }
            })
        ]);

        // Create transaction items if present
        if (itemDetails.length > 0) {
            await prisma.transactionItem.createMany({
                data: itemDetails.map(item => ({
                    transactionId: result[2].id,
                    menuItemId: item.menuItemId,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                }))
            });
        }

        await createAuditLog('VENDOR_PAYMENT', vendorUserId, 'TRANSACTION', result[2].id, {
            amount: finalAmount,
            studentId: student.id,
            studentCollegeId: studentId,
            items: itemDetails.length > 0 ? itemDetails : undefined
        }, req.ip);

        res.json({
            message: 'Payment successful',
            transaction: {
                id: result[2].id,
                amount: finalAmount,
                studentName: student.name,
                items: itemDetails,
                createdAt: result[2].createdAt
            },
            newVendorBalance: parseFloat(result[1].balance)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transaction failed' });
    }
};

// Vendor gets their transaction history
exports.getVendorTransactions = async (req, res) => {
    try {
        const vendorUserId = req.user.id;

        if (req.user.role !== 'VENDOR') {
            return res.status(403).json({ error: 'Only Vendors can view their transactions' });
        }

        const wallet = await prisma.wallet.findFirst({
            where: { userId: vendorUserId, type: 'VENDOR' }
        });
        if (!wallet) {
            return res.status(404).json({ error: 'Vendor wallet not found' });
        }

        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Filter to vendor's transactions and enrich with student info
        const vendorTx = transactions.filter(t => t.toWalletId === wallet.id);

        const enriched = await Promise.all(vendorTx.map(async (tx) => {
            let studentName = 'Unknown';
            if (tx.fromWalletId) {
                const fromWallet = await prisma.wallet.findFirst({ where: { id: tx.fromWalletId } });
                if (fromWallet && fromWallet.studentId) {
                    const student = await prisma.student.findUnique({ where: { id: fromWallet.studentId } });
                    if (student) studentName = student.name;
                }
            }
            return {
                ...tx,
                studentName
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Get all vendors
exports.getAllVendors = async (req, res) => {
    try {
        const vendors = await prisma.vendor.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Enrich with user data
        const enriched = await Promise.all(vendors.map(async (v) => {
            const user = await prisma.user.findUnique({ where: { id: v.userId } });
            return { ...v, user };
        }));

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

// Approve/Reject vendor
exports.approveVendor = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { approved } = req.body;

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const vendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: { approved }
        });

        await createAuditLog('VENDOR_APPROVED', req.user.id, 'VENDOR', vendorId, { approved }, req.ip);

        res.json(vendor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update vendor' });
    }
};

// Generate QR code for vendor
exports.generateQRCode = async (req, res) => {
    try {
        const userId = req.user.id;

        if (req.user.role !== 'VENDOR') {
            return res.status(403).json({ error: 'Only vendors can generate QR codes' });
        }

        // QR code contains vendor user ID
        const qrData = JSON.stringify({
            vendorId: userId,
            type: 'VENDOR_PAYMENT'
        });

        const qrCodeDataURL = await QRCode.toDataURL(qrData);

        res.json({ qrCode: qrCodeDataURL, vendorId: userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
};

// Get vendor list for students (approved vendors only)
exports.getApprovedVendors = async (req, res) => {
    try {
        const vendors = await prisma.vendor.findMany({
            where: { approved: true }
        });

        // Enrich with user data
        const enriched = await Promise.all(vendors.map(async (v) => {
            const user = await prisma.user.findUnique({ where: { id: v.userId } });
            return {
                id: v.id,
                userId: v.userId,
                storeName: v.storeName,
                name: user?.name,
                email: user?.email
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;
        if (req.user.role !== 'VENDOR') return res.status(403).json({ error: 'Only vendors can withdraw' });

        const wallet = await prisma.wallet.findFirst({ where: { userId, type: 'VENDOR' } });
        if (!wallet) return res.status(404).json({ error: 'Vendor wallet not found' });

        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Atomic: Deduct and Create Pending Transaction
        await prisma.$transaction([
            prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: amount } } }),
            prisma.transaction.create({
                data: {
                    fromWalletId: wallet.id,
                    amount,
                    type: 'WITHDRAWAL',
                    status: 'PENDING',
                    initiatedByUserId: userId,
                    description: 'Settlement Request'
                }
            })
        ]);

        await createAuditLog('WITHDRAWAL_REQUESTED', userId, 'WALLET', wallet.id, { amount }, req.ip);

        res.json({ message: 'Withdrawal requested' });
    } catch (error) {
        res.status(500).json({ error: 'Request failed' });
    }
};

// Approve settlement
exports.approveSettlement = async (req, res) => {
    try {
        const { transactionId } = req.body; // or params
        if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Only Admin can settle' });

        const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (!tx || tx.type !== 'WITHDRAWAL' || tx.status !== 'PENDING') {
            return res.status(400).json({ error: 'Invalid transaction' });
        }

        await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: 'COMPLETED', description: 'Settled by Admin' }
        });

        await createAuditLog('SETTLEMENT_APPROVED', req.user.id, 'TRANSACTION', transactionId, {}, req.ip);

        res.json({ message: 'Settlement approved (Bank transfer simulated)' });
    } catch (error) {
        res.status(500).json({ error: 'Settlement failed' });
    }
};

