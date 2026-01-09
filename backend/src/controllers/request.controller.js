const prisma = require('../utils/db');

exports.createRequest = async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const userId = req.user.id;
        if (req.user.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can request money' });

        const request = await prisma.moneyRequest.create({
            data: {
                studentId: userId,
                amount,
                reason,
                status: 'PENDING'
            }
        });

        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create request' });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const guardianId = req.user.id;
        if (req.user.role !== 'GUARDIAN') return res.status(403).json({ error: 'Only guardians can approve requests' });

        const request = await prisma.moneyRequest.findUnique({
            where: { id: requestId },
            include: { student: true }
        });

        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

        // Check relationship (Optional: Ensure this guardian matches student's guardian)
        if (request.student.guardianId && request.student.guardianId !== guardianId) {
            // Strict check if student has a guardian set
            return res.status(403).json({ error: 'Not authorized for this student' });
        }

        // Guardian Wallet
        const guardianWallet = await prisma.wallet.findFirst({ where: { userId: guardianId, type: 'GUARDIAN' } });
        if (!guardianWallet) return res.status(404).json({ error: 'Guardian wallet not found' });

        if (parseFloat(guardianWallet.balance) < parseFloat(request.amount)) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // Student Wallet
        const studentWallet = await prisma.wallet.findFirst({ where: { userId: request.studentId, type: 'STUDENT' } });
        if (!studentWallet) return res.status(404).json({ error: 'Student wallet not found' });

        // Transaction
        await prisma.$transaction([
            // Update Request
            prisma.moneyRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED', reviewedByUserId: guardianId }
            }),
            // Transfer Money
            prisma.wallet.update({ where: { id: guardianWallet.id }, data: { balance: { decrement: request.amount } } }),
            prisma.wallet.update({ where: { id: studentWallet.id }, data: { balance: { increment: request.amount } } }),
            // Transaction Record
            prisma.transaction.create({
                data: {
                    fromWalletId: guardianWallet.id,
                    toWalletId: studentWallet.id,
                    amount: request.amount,
                    type: 'TRANSFER',
                    status: 'COMPLETED',
                    initiatedByUserId: guardianId,
                    description: `Request Approved: ${request.reason || ''}`
                }
            })
        ]);

        res.json({ message: 'Request approved and money transferred' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Approval failed' });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const guardianId = req.user.id;
        if (req.user.role !== 'GUARDIAN') return res.status(403).json({ error: 'Only guardians can reject' });

        await prisma.moneyRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED', reviewedByUserId: guardianId }
        });

        res.json({ message: 'Request rejected' });
    } catch (error) {
        res.status(500).json({ error: 'Reject failed' });
    }
}

exports.listRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        let where = {};
        if (req.user.role === 'STUDENT') {
            where = { studentId: userId };
        } else if (req.user.role === 'GUARDIAN') {
            // Find all students for this guardian
            const students = await prisma.user.findMany({ where: { guardianId: userId } });
            const studentIds = students.map(s => s.id);
            where = { studentId: { in: studentIds } };
        }

        const requests = await prisma.moneyRequest.findMany({
            where,
            include: { student: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'List failed' });
    }
}
