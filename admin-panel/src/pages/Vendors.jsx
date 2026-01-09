import React, { useState, useEffect } from 'react';
import api from '../api';

const Vendors = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            const response = await api.get('/vendor');
            setVendors(response.data);
        } catch (err) {
            console.error('Failed to fetch vendors:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (vendorId, approved) => {
        try {
            await api.patch(`/vendor/${vendorId}/approve`, { approved });
            fetchVendors(); // Refresh list
        } catch (err) {
            console.error('Failed to update vendor:', err);
            alert('Failed to update vendor status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2EF2C5]"></div>
            </div>
        );
    }

    const approvedVendors = vendors.filter(v => v.approved);
    const pendingVendors = vendors.filter(v => !v.approved);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Vendors</h1>
                    <p className="text-gray-400">Manage vendor approvals and settlements</p>
                </div>
                <button
                    onClick={fetchVendors}
                    className="px-4 py-2 bg-[#2EF2C5] text-[#0B0F1A] rounded-lg font-semibold hover:bg-[#26d4ad] transition-colors"
                >
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#151B2B] p-6 rounded-xl border border-cyan-500/30">
                    <h3 className="text-gray-400 text-sm uppercase mb-2">Total Vendors</h3>
                    <p className="text-4xl font-bold text-cyan-400">{vendors.length}</p>
                </div>
                <div className="bg-[#151B2B] p-6 rounded-xl border border-green-500/30">
                    <h3 className="text-gray-400 text-sm uppercase mb-2">Approved</h3>
                    <p className="text-4xl font-bold text-green-400">{approvedVendors.length}</p>
                </div>
                <div className="bg-[#151B2B] p-6 rounded-xl border border-orange-500/30">
                    <h3 className="text-gray-400 text-sm uppercase mb-2">Pending Approval</h3>
                    <p className="text-4xl font-bold text-orange-400">{pendingVendors.length}</p>
                </div>
            </div>

            {/* Pending Vendors */}
            {pendingVendors.length > 0 && (
                <div className="bg-[#151B2B] rounded-xl border border-orange-500/30 overflow-hidden">
                    <div className="p-6 border-b border-gray-800 bg-orange-500/10">
                        <h2 className="text-xl font-bold text-white flex items-center">
                            <span className="mr-2">⚠️</span>
                            Pending Approval ({pendingVendors.length})
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {pendingVendors.map((vendor) => (
                            <div key={vendor.id} className="bg-[#0B0F1A] p-6 rounded-lg border border-gray-800">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-white mb-2">{vendor.storeName}</h3>
                                        <div className="space-y-1 text-sm">
                                            <p className="text-gray-400">
                                                <span className="font-semibold">Owner:</span> {vendor.user?.name || 'N/A'}
                                            </p>
                                            <p className="text-gray-400">
                                                <span className="font-semibold">Email:</span> {vendor.user?.email || 'N/A'}
                                            </p>
                                            <p className="text-gray-400">
                                                <span className="font-semibold">Registered:</span>{' '}
                                                {new Date(vendor.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(vendor.id, true)}
                                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => handleApprove(vendor.id, false)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                                        >
                                            ✗ Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Approved Vendors */}
            <div className="bg-[#151B2B] rounded-xl border border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">Approved Vendors ({approvedVendors.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#0B0F1A]">
                            <tr>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Store Name</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Owner</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Email</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Registered</th>
                                <th className="py-4 px-6 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {approvedVendors.length > 0 ? (
                                approvedVendors.map((vendor) => (
                                    <tr key={vendor.id} className="border-b border-gray-800 hover:bg-[#1a2030] transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="text-white font-semibold">{vendor.storeName}</span>
                                        </td>
                                        <td className="py-4 px-6 text-gray-400">{vendor.user?.name || 'N/A'}</td>
                                        <td className="py-4 px-6 text-gray-400">{vendor.user?.email || 'N/A'}</td>
                                        <td className="py-4 px-6">
                                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                                                Approved
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-gray-400 text-sm">
                                            {new Date(vendor.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6">
                                            <button
                                                onClick={() => handleApprove(vendor.id, false)}
                                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition-colors"
                                            >
                                                Revoke
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500">
                                        No approved vendors yet
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

export default Vendors;
