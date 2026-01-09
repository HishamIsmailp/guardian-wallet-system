const prisma = require('../utils/db');
const { createAuditLog } = require('../utils/auditLog');
const QRCode = require('qrcode');

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

