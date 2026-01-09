import React, { useState, useEffect } from 'react';
import api from '../api';

const StatCard = ({ title, value, subtitle, color, icon }) => (
    <div className={`bg-[#151B2B] p-6 rounded-xl border border-${color}-500/30 hover:border-${color}-500/50 transition-all duration-300`}>
        <div className="flex items-start justify-between">
            <div>
                <h3 className="text-gray-400 text-sm uppercase mb-2">{title}</h3>
                <p className={`text-4xl font-bold text-${color}-400 mb-1`}>{value}</p>
                {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
            </div>
            {icon && <div className={`text-${color}-400 text-3xl opacity-50`}>{icon}</div>}
        </div>
    </div>
);

const TransactionRow = ({ transaction }) => {
    const getTypeColor = (type) => {
        switch (type) {
            case 'DEPOSIT': return 'text-green-400';
            case 'PAYMENT': return 'text-blue-400';
            case 'TRANSFER': return 'text-purple-400';
            case 'WITHDRAWAL': return 'text-orange-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <tr className="border-b border-gray-800 hover:bg-[#151B2B] transition-colors">
            <td className="py-3 px-4 text-sm">{transaction.id.substring(0, 8)}...</td>
            <td className={`py-3 px-4 text-sm font-semibold ${getTypeColor(transaction.type)}`}>
                {transaction.type}
            </td>
            <td className="py-3 px-4 text-sm text-[#2EF2C5]">₹{parseFloat(transaction.amount).toFixed(2)}</td>
            <td className="py-3 px-4 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${transaction.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        transaction.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                    }`}>
                    {transaction.status}
                </span>
            </td>
            <td className="py-3 px-4 text-sm text-gray-400">
                {new Date(transaction.createdAt).toLocaleDateString()}
            </td>
        </tr>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/dashboard/stats');
            setStats(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
            setError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2EF2C5]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Welcome to Guardian Wallet Admin Panel</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    subtitle={`${stats?.totalGuardians || 0} Guardians, ${stats?.totalStudents || 0} Students`}
                    color="blue"
                    icon="👥"
                />
                <StatCard
                    title="Total Transactions"
                    value={stats?.totalTransactions || 0}
                    subtitle={`${stats?.completedTransactions || 0} completed`}
                    color="green"
                    icon="💳"
                />
                <StatCard
                    title="Total Volume"
                    value={`₹${(stats?.totalVolume || 0).toFixed(2)}`}
                    subtitle="All time"
                    color="purple"
                    icon="💰"
                />
                <StatCard
                    title="Pending Requests"
                    value={stats?.pendingRequests || 0}
                    subtitle={`${stats?.approvedRequests || 0} approved`}
                    color="yellow"
                    icon="⏳"
                />
            </div>

            {/* Vendors Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Vendors"
                    value={stats?.totalVendors || 0}
                    color="cyan"
                />
                <StatCard
                    title="Approved Vendors"
                    value={stats?.approvedVendors || 0}
                    color="green"
                />
                <StatCard
                    title="Pending Approval"
                    value={stats?.pendingVendors || 0}
                    color="orange"
                />
            </div>

            {/* Recent Transactions */}
            <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#0B0F1A]">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase">ID</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentTransactions?.length > 0 ? (
                                stats.recentTransactions.map((transaction) => (
                                    <TransactionRow key={transaction.id} transaction={transaction} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-500">
                                        No transactions yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Money Requests */}
            <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Recent Money Requests</h2>
                </div>
                <div className="p-6">
                    {stats?.recentRequests?.length > 0 ? (
                        <div className="space-y-3">
                            {stats.recentRequests.map((request) => (
                                <div key={request.id} className="flex items-center justify-between p-4 bg-[#0B0F1A] rounded-lg">
                                    <div>
                                        <p className="text-white font-semibold">₹{parseFloat(request.amount).toFixed(2)}</p>
                                        <p className="text-sm text-gray-400">{request.reason || 'No reason provided'}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${request.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                                            request.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                        }`}>
                                        {request.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No money requests yet</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
