const prisma = require('./db');

/**
 * Create an audit log entry
 * @param {string} action - Action performed (e.g., 'USER_LOGIN', 'MONEY_TRANSFER')
 * @param {string} userId - User who performed the action
 * @param {string} entityType - Type of entity affected (e.g., 'USER', 'WALLET', 'TRANSACTION')
 * @param {string} entityId - ID of the affected entity
 * @param {object} details - Additional details about the action
 * @param {string} ipAddress - IP address of the request
 */
async function createAuditLog(action, userId, entityType, entityId, details = {}, ipAddress = null) {
    try {
        // Since we don't have an audit_logs model in db.js, we'll add it directly to the database
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.resolve(__dirname, '../../database.json');

        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        const auditLog = {
            id: require('crypto').randomUUID(),
            action,
            userId,
            entityType,
            entityId,
            details: JSON.stringify(details),
            ipAddress,
            createdAt: new Date().toISOString()
        };

        dbData.audit_logs.push(auditLog);
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));

        return auditLog;
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - audit logging should not break the main flow
    }
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters = {}) {
    try {
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.resolve(__dirname, '../../database.json');

        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        let logs = dbData.audit_logs || [];

        // Apply filters
        if (filters.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.action) {
            logs = logs.filter(log => log.action === filters.action);
        }
        if (filters.entityType) {
            logs = logs.filter(log => log.entityType === filters.entityType);
        }
        if (filters.startDate) {
            logs = logs.filter(log => new Date(log.createdAt) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            logs = logs.filter(log => new Date(log.createdAt) <= new Date(filters.endDate));
        }

        // Sort by date descending
        logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Limit results
        if (filters.limit) {
            logs = logs.slice(0, filters.limit);
        }

        return logs;
    } catch (error) {
        console.error('Failed to get audit logs:', error);
        return [];
    }
}

module.exports = {
    createAuditLog,
    getAuditLogs
};
