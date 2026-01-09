import React, { useState } from 'react';
import api from '../api';

const Reports = () => {
    const [reportType, setReportType] = useState('transactions');
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/reports', {
                params: {
                    reportType,
                    startDate: dateRange.startDate,
                    endDate: dateRange.endDate
                }
            });
            setReport(response.data);
        } catch (err) {
            console.error('Failed to generate report:', err);
            alert('Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = () => {
        if (!report) return;

        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType}_report_${new Date().toISOString()}.json`;
        link.click();
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
                <p className="text-gray-400">Generate and download system reports</p>
            </div>

            {/* Report Configuration */}
            <div className="bg-[#151B2B] p-6 rounded-xl border border-gray-800">
                <h2 className="text-xl font-bold text-white mb-4">Generate Report</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                        >
                            <option value="transactions">Transactions Report</option>
                            <option value="users">Users Report</option>
                            <option value="vendors">Vendors Report</option>
                        </select>
                    </div>

                    {reportType === 'transactions' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-[#0B0F1A] border border-gray-700 rounded-lg text-white focus:border-[#2EF2C5] focus:outline-none"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="px-6 py-2 bg-[#2EF2C5] text-[#0B0F1A] rounded-lg font-semibold hover:bg-[#26d4ad] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate Report'}
                    </button>
                    {report && (
                        <button
                            onClick={downloadReport}
                            className="px-6 py-2 bg-[#8B5CF6] text-white rounded-lg font-semibold hover:bg-[#7c4fe0] transition-colors"
                        >
                            📥 Download JSON
                        </button>
                    )}
                </div>
            </div>

            {/* Report Display */}
            {report && (
                <div className="bg-[#151B2B] p-6 rounded-xl border border-gray-800">
                    <h2 className="text-xl font-bold text-white mb-4">Report Results</h2>

                    {/* Transactions Report */}
                    {report.type === 'transactions' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Total Transactions</p>
                                    <p className="text-2xl font-bold text-white">{report.totalTransactions}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Total Volume</p>
                                    <p className="text-2xl font-bold text-[#2EF2C5]">₹{report.totalVolume.toFixed(2)}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Completed</p>
                                    <p className="text-2xl font-bold text-green-400">{report.byStatus.COMPLETED}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-400">{report.byStatus.PENDING}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-[#0B0F1A] p-4 rounded-lg border border-green-500/30">
                                    <p className="text-gray-400 text-sm mb-1">Deposits</p>
                                    <p className="text-xl font-bold text-green-400">{report.byType.DEPOSIT}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg border border-blue-500/30">
                                    <p className="text-gray-400 text-sm mb-1">Payments</p>
                                    <p className="text-xl font-bold text-blue-400">{report.byType.PAYMENT}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg border border-purple-500/30">
                                    <p className="text-gray-400 text-sm mb-1">Transfers</p>
                                    <p className="text-xl font-bold text-purple-400">{report.byType.TRANSFER}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg border border-orange-500/30">
                                    <p className="text-gray-400 text-sm mb-1">Withdrawals</p>
                                    <p className="text-xl font-bold text-orange-400">{report.byType.WITHDRAWAL}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users Report */}
                    {report.type === 'users' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Total Users</p>
                                    <p className="text-2xl font-bold text-white">{report.totalUsers}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Verified</p>
                                    <p className="text-2xl font-bold text-green-400">{report.verifiedUsers}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Unverified</p>
                                    <p className="text-2xl font-bold text-yellow-400">{report.unverifiedUsers}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Vendors Report */}
                    {report.type === 'vendors' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Total Vendors</p>
                                    <p className="text-2xl font-bold text-white">{report.totalVendors}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Approved</p>
                                    <p className="text-2xl font-bold text-green-400">{report.approvedVendors}</p>
                                </div>
                                <div className="bg-[#0B0F1A] p-4 rounded-lg">
                                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                                    <p className="text-2xl font-bold text-orange-400">{report.pendingVendors}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Raw Data Preview */}
                    <div className="mt-6">
                        <h3 className="text-lg font-bold text-white mb-3">Raw Data Preview</h3>
                        <div className="bg-[#0B0F1A] p-4 rounded-lg overflow-auto max-h-96">
                            <pre className="text-sm text-gray-400">
                                {JSON.stringify(report, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
