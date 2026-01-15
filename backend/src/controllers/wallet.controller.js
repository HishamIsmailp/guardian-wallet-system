const prisma = require('../utils/db');
const { createAuditLog } = require('../utils/auditLog');

// Parent/Guardian adds money to their own wallet
exports.addMoney = async (req, res) => {
    try {
        const { amount } = req.body; // Expecting decimal or number
        const userId = req.user.id;

        if (req.user.role !== 'GUARDIAN') {
            return res.status(403).json({ error: 'Only Guardians can add money' });
        }

        // Find Guardian Wallet
        const wallet = await prisma.wallet.findFirst({
            where: { userId, type: 'GUARDIAN' }
        });

        if (!wallet) return res.status(404).json({ error: 'Guardian wallet not found' });

        // Transaction
        const result = await prisma.$transaction([
            prisma.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    toWalletId: wallet.id,
                    amount,
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    initiatedByUserId: userId,
                    description: 'Load Money'
                }
            })
        ]);

        await createAuditLog('MONEY_ADDED', userId, 'WALLET', wallet.id, { amount }, req.ip);

        res.json({ message: 'Money added successfully', wallet: result[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Add money failed' });
    }
};

// NOTE: transferToStudent moved to student.controller.js
// This endpoint is deprecated - use /api/student/transfer instead

// NOTE: payVendor removed - Students don't interact with system
// Vendors now initiate payments using student ID + PIN
// Use /api/vendor/transaction instead

exports.getBalance = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        console.log('getBalance: Wallet data:', JSON.stringify(wallet));
        console.log('getBalance: Balance type:', typeof wallet.balance);
        console.log('getBalance: Balance value:', wallet.balance);

        res.json(wallet);
    } catch (error) {
        console.error('getBalance error:', error);
        res.status(500).json({ error: 'Failed to fetch balance' });
    }
}

// Get transaction history
exports.getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, status, limit = 50 } = req.query;

        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        let where = {
            $or: [
                { fromWalletId: wallet.id },
                { toWalletId: wallet.id }
            ]
        };

        // Build filter - simplified for JSON DB
        const allTransactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        let filtered = allTransactions.filter(t =>
            t.fromWalletId === wallet.id || t.toWalletId === wallet.id
        );

        if (type) {
            filtered = filtered.filter(t => t.type === type);
        }
        if (status) {
            filtered = filtered.filter(t => t.status === status);
        }

        filtered = filtered.slice(0, parseInt(limit));

        res.json(filtered);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Get all transactions (Admin only)
exports.getAllTransactions = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { limit = 100 } = req.query;
        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        res.json(transactions.slice(0, parseInt(limit)));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// Create or update wallet rule
exports.setWalletRule = async (req, res) => {
    try {
        const { walletId, dailyLimit, allowedVendors, active } = req.body;
        const userId = req.user.id;

        if (req.user.role !== 'GUARDIAN' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only Guardians or Admins can set rules' });
        }

        // Verify wallet ownership if Guardian
        if (req.user.role === 'GUARDIAN') {
            const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
            if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

            const student = await prisma.user.findUnique({ where: { id: wallet.userId } });
            if (!student || student.guardianId !== userId) {
                return res.status(403).json({ error: 'Not authorized for this wallet' });
            }
        }

        // Check if rule exists
        const existing = await prisma.walletRule.findFirst({ where: { walletId } });

        let rule;
        if (existing) {
            rule = await prisma.walletRule.update({
                where: { id: existing.id },
                data: { dailyLimit, allowedVendors, active }
            });
        } else {
            rule = await prisma.walletRule.create({
                data: { walletId, dailyLimit, allowedVendors, active: active !== false }
            });
        }

        await createAuditLog('WALLET_RULE_SET', userId, 'WALLET_RULE', rule.id, { dailyLimit, allowedVendors }, req.ip);

        res.json(rule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to set wallet rule' });
    }
};

// Get wallet rule
exports.getWalletRule = async (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = await prisma.wallet.findFirst({ where: { userId } });
        if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

        const rule = await prisma.walletRule.findFirst({ where: { walletId: wallet.id } });
        res.json(rule || { dailyLimit: null, allowedVendors: [], active: false });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch wallet rule' });
    }
};

