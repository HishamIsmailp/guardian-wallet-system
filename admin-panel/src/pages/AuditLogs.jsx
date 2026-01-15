import React, { useState, useEffect } from 'react';
import api from '../api';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ action: '', entityType: '' });

    useEffect(() => {
        fetchAuditLogs();
    }, []);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/audit-logs', {
                params: { limit: 200 }
            });
            setLogs(response.data || []);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('LOGIN') || action.includes('CREATED')) {
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        }
        if (action.includes('FAILED') || action.includes('BLOCKED')) {
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        }
        if (action.includes('TRANSFER') || action.includes('PAYMENT')) {
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        }
        if (action.includes('UPDATE') || action.includes('SET')) {
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
        if (action.includes('APPROVE') || action.includes('SETTLEMENT')) {
            return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        }
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    const getEntityColor = (entityType) => {
        switch (entityType) {
            case 'USER': return 'text-blue-400';
            case 'STUDENT': return 'text-cyan-400';
            case 'WALLET': return 'text-green-400';
            case 'TRANSACTION': return 'text-purple-400';
            case 'VENDOR': return 'text-orange-400';
            case 'WALLET_RULE': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const parseDetails = (details) => {
        try {
            if (typeof details === 'string') {
                return JSON.parse(details);
            }
            return details || {};
        } catch {
            return {};
        }
    };

    // Get unique actions and entity types for filters
    const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
    const uniqueEntityTypes = [...new Set(logs.map(l => l.entityType))].filter(Boolean).sort();

    const filteredLogs = logs.filter(l => {
        if (filter.action && l.action !== filter.action) return false;
        if (filter.entityType && l.entityType !== filter.entityType) return false;
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2EF2C5]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Audit Logs</h1>
                    <p className="text-gray-400">Track all system activities and security events</p>
                </div>
                <button
                    onClick={fetchAuditLogs}
                    className="px-4 py-2 bg-[#2EF2C5] text-[#0B0F1A] rounded-lg font-semibold hover:bg-[#26d4ad] transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-[#151B2B] p-6 rounded-xl border border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Action</label>
                        <select
                            value={filter.action}
                            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Entity Type</label>
                        <select
                            value={filter.entityType}
                            onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                        >
                            <option value="">All Entities</option>
                            {uniqueEntityTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#151B2B] p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm mb-1">Total Logs</p>
                    <p className="text-2xl font-bold text-white">{filteredLogs.length}</p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-green-500/30">
                    <p className="text-gray-400 text-sm mb-1">Payments</p>
                    <p className="text-2xl font-bold text-green-400">
                        {filteredLogs.filter(l => l.action.includes('PAYMENT')).length}
                    </p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-red-500/30">
                    <p className="text-gray-400 text-sm mb-1">Failed Attempts</p>
                    <p className="text-2xl font-bold text-red-400">
                        {filteredLogs.filter(l => l.action.includes('FAILED')).length}
                    </p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-cyan-500/30">
                    <p className="text-gray-400 text-sm mb-1">Student Events</p>
                    <p className="text-2xl font-bold text-cyan-400">
                        {filteredLogs.filter(l => l.entityType === 'STUDENT').length}
                    </p>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#0B0F1A]">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Timestamp</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Entity</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Entity ID</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Details</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => {
                                    const details = parseDetails(log.details);
                                    return (
                                        <tr key={log.id} className="border-b border-gray-800 hover:bg-[#1a2030] transition-colors">
                                            <td className="py-4 px-6 text-sm text-gray-400">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`font-semibold ${getEntityColor(log.entityType)}`}>
                                                    {log.entityType || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm text-gray-400 font-mono">
                                                    {log.entityId ? `${log.entityId.substring(0, 8)}...` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-400 max-w-xs">
                                                {Object.keys(details).length > 0 ? (
                                                    <div className="space-y-1">
                                                        {Object.entries(details).slice(0, 3).map(([key, value]) => (
                                                            <div key={key} className="text-xs">
                                                                <span className="text-gray-500">{key}:</span>{' '}
                                                                <span className="text-gray-300">{String(value).substring(0, 20)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500 font-mono">
                                                {log.ipAddress || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500">
                                        No audit logs found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
