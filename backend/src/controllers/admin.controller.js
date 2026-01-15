const prisma = require('../utils/db');
const { getAuditLogs } = require('../utils/auditLog');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const users = await prisma.user.findMany({});
        const students = await prisma.student.findMany({});  // Students are separate entities now
        const wallets = await prisma.wallet.findMany({});
        const transactions = await prisma.transaction.findMany({});
        const vendors = await prisma.vendor.findMany({});

        // Get role IDs
        const guardianRole = await prisma.role.findFirst({ where: { name: 'GUARDIAN' } });

        // Calculate stats
        const stats = {
            totalUsers: users.length,
            totalGuardians: users.filter(u => u.roleId === guardianRole?.id).length,
            totalStudents: students.length,  // Count from students table
            activeStudents: students.filter(s => s.status === 'ACTIVE').length,
            blockedStudents: students.filter(s => s.status === 'BLOCKED').length,
            totalVendors: vendors.length,
            approvedVendors: vendors.filter(v => v.approved).length,
            pendingVendors: vendors.filter(v => !v.approved).length,

            totalWallets: wallets.length,
            totalBalance: wallets.reduce((sum, w) => sum + parseFloat(w.balance || 0), 0),

            totalTransactions: transactions.length,
            completedTransactions: transactions.filter(t => t.status === 'COMPLETED').length,
            pendingTransactions: transactions.filter(t => t.status === 'PENDING').length,
            totalVolume: transactions.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),

            // Transaction breakdown by type
            deposits: transactions.filter(t => t.type === 'DEPOSIT').length,
            transfers: transactions.filter(t => t.type === 'TRANSFER').length,
            payments: transactions.filter(t => t.type === 'PAYMENT').length,
            withdrawals: transactions.filter(t => t.type === 'WITHDRAWAL').length,

            // Recent activity
            recentTransactions: transactions.slice(0, 10)
        };

        res.json(stats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { userId, action, entityType, startDate, endDate, limit } = req.query;

        const logs = await getAuditLogs({
            userId,
            action,
            entityType,
            startDate,
            endDate,
            limit: limit || 100
        });

        res.json(logs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

// Generate reports
exports.generateReport = async (req, res) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { reportType, startDate, endDate } = req.query;

        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });

        let filtered = transactions;
        if (startDate) {
            filtered = filtered.filter(t => new Date(t.createdAt) >= new Date(startDate));
        }
        if (endDate) {
            filtered = filtered.filter(t => new Date(t.createdAt) <= new Date(endDate));
        }

        let report = {};

        switch (reportType) {
            case 'transactions':
                report = {
                    type: 'transactions',
                    period: { startDate, endDate },
                    totalTransactions: filtered.length,
                    totalVolume: filtered.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
                    byType: {
                        DEPOSIT: filtered.filter(t => t.type === 'DEPOSIT').length,
                        PAYMENT: filtered.filter(t => t.type === 'PAYMENT').length,
                        TRANSFER: filtered.filter(t => t.type === 'TRANSFER').length,
                        WITHDRAWAL: filtered.filter(t => t.type === 'WITHDRAWAL').length,
                    },
                    byStatus: {
                        COMPLETED: filtered.filter(t => t.status === 'COMPLETED').length,
                        PENDING: filtered.filter(t => t.status === 'PENDING').length,
                        FAILED: filtered.filter(t => t.status === 'FAILED').length,
                    },
                    transactions: filtered
                };
                break;

            case 'users':
                const users = await prisma.user.findMany({});
                report = {
                    type: 'users',
                    totalUsers: users.length,
                    verifiedUsers: users.filter(u => u.isVerified).length,
                    unverifiedUsers: users.filter(u => !u.isVerified).length,
                    users: users.map(u => {
                        const { passwordHash, ...safe } = u;
                        return safe;
                    })
                };
                break;

            case 'vendors':
                const vendors = await prisma.vendor.findMany({});
                report = {
                    type: 'vendors',
                    totalVendors: vendors.length,
                    approvedVendors: vendors.filter(v => v.approved).length,
                    pendingVendors: vendors.filter(v => !v.approved).length,
                    vendors
                };
                break;

            default:
                return res.status(400).json({ error: 'Invalid report type' });
        }

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};
