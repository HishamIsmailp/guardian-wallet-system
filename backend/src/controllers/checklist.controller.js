const prisma = require('../utils/db');
const crypto = require('crypto');

// Get task checklists
exports.getChecklists = async (req, res) => {
    try {
        const { role } = req.query;
        const userId = req.user.id;

        // fetch from database using Prisma
        const where = {};
        if (role) {
            where.role = role;
        } else {
            where.role = req.user.role;
        }
        if (req.user.role !== 'ADMIN') {
            where.OR = [
                { userId },
                { userId: null }
            ];
        }
        const checklists = await prisma.taskChecklist.findMany({ where });
        res.json(checklists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch checklists' });
    }
};

// Create checklist item
exports.createChecklist = async (req, res) => {
    try {
        const { title, description, role, userId } = req.body;

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can create checklists' });
        }

        const checklist = await prisma.taskChecklist.create({
            data: {
                title,
                description,
                role,
                userId: userId || null,
                status: 'PENDING'
            }
        });
        res.status(201).json(checklist);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create checklist' });
    }
};

// Update checklist status
exports.updateChecklistStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // find checklist
        const checklist = await prisma.taskChecklist.findUnique({ where: { id } });
        if (!checklist) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        if (req.user.role !== 'ADMIN' && checklist.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const updated = await prisma.taskChecklist.update({
            where: { id },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update checklist' });
    }
};

// Delete checklist
exports.deleteChecklist = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Only admins can delete checklists' });
        }

        const existing = await prisma.taskChecklist.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Checklist not found' });
        }
        await prisma.taskChecklist.delete({ where: { id } });
        res.json({ message: 'Checklist deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete checklist' });
    }
};
