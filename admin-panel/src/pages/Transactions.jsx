import React, { useState, useEffect } from 'react';
import api from '../api';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [processing, setProcessing] = useState(null);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/wallet/transactions/all', {
                params: { limit: 100 }
            });
            setTransactions(response.data);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const approveSettlement = async (transactionId) => {
        if (!window.confirm('Approve this settlement request?')) return;
        setProcessing(transactionId);
        try {
            await api.post('/vendor/settlement', { transactionId });
            alert('Settlement approved successfully');
            fetchTransactions();
        } catch (err) {
            alert('Failed to approve: ' + (err.response?.data?.error || 'Unknown error'));
        } finally {
            setProcessing(null);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'DEPOSIT': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'PAYMENT': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'TRANSFER': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'WITHDRAWAL': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-500/20 text-green-400';
            case 'PENDING': return 'bg-yellow-500/20 text-yellow-400';
            case 'FAILED': return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const filteredTransactions = transactions.filter(t => {
        if (filter.type && t.type !== filter.type) return false;
        if (filter.status && t.status !== filter.status) return false;
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
                    <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
                    <p className="text-gray-400">Monitor all system transactions</p>
                </div>
                <button
                    onClick={fetchTransactions}
                    className="px-4 py-2 bg-[#2EF2C5] text-[#0B0F1A] rounded-lg font-semibold hover:bg-[#26d4ad] transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="bg-[#151B2B] p-6 rounded-xl border border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Type</label>
                        <select
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                        >
                            <option value="">All Types</option>
                            <option value="DEPOSIT">Deposit</option>
                            <option value="PAYMENT">Payment</option>
                            <option value="TRANSFER">Transfer</option>
                            <option value="WITHDRAWAL">Withdrawal</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                        >
                            <option value="">All Statuses</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#151B2B] p-4 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-sm mb-1">Total</p>
                    <p className="text-2xl font-bold text-white">{filteredTransactions.length}</p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-green-500/30">
                    <p className="text-gray-400 text-sm mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-400">
                        {filteredTransactions.filter(t => t.status === 'COMPLETED').length}
                    </p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-yellow-500/30">
                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        {filteredTransactions.filter(t => t.status === 'PENDING').length}
                    </p>
                </div>
                <div className="bg-[#151B2B] p-4 rounded-lg border border-purple-500/30">
                    <p className="text-gray-400 text-sm mb-1">Total Volume</p>
                    <p className="text-2xl font-bold text-purple-400">
                        ₹{filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#0B0F1A]">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">ID</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Amount</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Description</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-[#1a2030] transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="text-sm text-gray-400 font-mono">
                                                {transaction.id.substring(0, 8)}...
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(transaction.type)}`}>
                                                {transaction.type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-[#2EF2C5] font-bold">
                                                ₹{parseFloat(transaction.amount).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-400 max-w-xs truncate">
                                            {transaction.description || 'N/A'}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-400">
                                            {new Date(transaction.createdAt).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            {transaction.type === 'WITHDRAWAL' && transaction.status === 'PENDING' ? (
                                                <button
                                                    onClick={() => approveSettlement(transaction.id)}
                                                    disabled={processing === transaction.id}
                                                    className="px-3 py-1 bg-green-500 text-white rounded text-xs font-semibold hover:bg-green-600 disabled:opacity-50"
                                                >
                                                    {processing === transaction.id ? 'Processing...' : 'Approve'}
                                                </button>
                                            ) : (
                                                <span className="text-gray-600">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-500">
                                        No transactions found
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

export default Transactions;
