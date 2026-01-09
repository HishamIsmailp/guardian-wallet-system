const prisma = require('../utils/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get task checklists
exports.getChecklists = async (req, res) => {
    try {
        const { role } = req.query;
        const userId = req.user.id;

        const dbPath = path.resolve(__dirname, '../../database.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        let checklists = dbData.task_checklists || [];

        // Filter by role if specified
        if (role) {
            checklists = checklists.filter(c => c.role === role);
        } else {
            // Filter by user's role
            checklists = checklists.filter(c => c.role === req.user.role);
        }

        // Filter by userId if not admin
        if (req.user.role !== 'ADMIN') {
            checklists = checklists.filter(c => c.userId === userId || !c.userId);
        }

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

        const dbPath = path.resolve(__dirname, '../../database.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        const checklist = {
            id: crypto.randomUUID(),
            title,
            description,
            role,
            userId: userId || null,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        dbData.task_checklists.push(checklist);
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

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

        const dbPath = path.resolve(__dirname, '../../database.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        const index = dbData.task_checklists.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        // Check permissions
        const checklist = dbData.task_checklists[index];
        if (req.user.role !== 'ADMIN' && checklist.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        dbData.task_checklists[index].status = status;
        dbData.task_checklists[index].updatedAt = new Date().toISOString();

        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

        res.json(dbData.task_checklists[index]);
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

        const dbPath = path.resolve(__dirname, '../../database.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        const index = dbData.task_checklists.findIndex(c => c.id === id);
        if (index === -1) {
            return res.status(404).json({ error: 'Checklist not found' });
        }

        dbData.task_checklists.splice(index, 1);
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

        res.json({ message: 'Checklist deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete checklist' });
    }
};
