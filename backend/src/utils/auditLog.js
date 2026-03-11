const prisma = require('./db');

/**
 * Create an audit log entry using Prisma
 * Flexible parameters for backward compatibility with old (entityType, entityId) calls
 */
async function createAuditLog(action, userId, entityTypeOrDetails, entityIdOrDetails, detailsOrIpAddress, ipAddress) {
    try {
        // Parse parameters flexibly to support old and new signatures
        let details = {};
        if (typeof entityTypeOrDetails === 'object' && entityTypeOrDetails !== null) {
            details = entityTypeOrDetails;
        } else if (typeof detailsOrIpAddress === 'object' && detailsOrIpAddress !== null) {
            details = detailsOrIpAddress;
        }

        return await prisma.auditLog.create({
            data: {
                action,
                userId: userId || null,
                details: Object.keys(details).length > 0 ? JSON.stringify(details) : null,
                // timestamp will be set by default
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // don't propagate so that logging doesn't break flow
    }
}

/**
 * Get audit logs with optional filters
 */
async function getAuditLogs(filters = {}) {
    try {
        const where = {};
        if (filters.userId) where.userId = filters.userId;
        if (filters.action) where.action = filters.action;
        if (filters.startDate || filters.endDate) {
            where.timestamp = {};
            if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
            if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: filters.limit || undefined
        });

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
