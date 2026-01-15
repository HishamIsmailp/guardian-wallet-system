import React, { useEffect, useState } from 'react';
import api from '../api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/auth/users');
            // Filter out any legacy STUDENT users - students are now separate
            const filteredUsers = data.filter(u => u.role?.name !== 'STUDENT');
            setUsers(filteredUsers);
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleVerify = async (id, currentStatus) => {
        try {
            await api.patch(`/auth/users/${id}/verify`, { isVerified: !currentStatus });
            fetchUsers(); // Refresh
        } catch (error) {
            alert('Failed to update status');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <div className="bg-[#151B2B] rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#0B0F1A] text-gray-400 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                    </tr>
                </thead>
                <tbody className="text-gray-300 divide-y divide-gray-800">
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                            <td className="px-6 py-4">{user.email}</td>
                            <td className="px-6 py-4 text-[#2EF2C5]">{user.role?.name}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs ${user.isVerified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {user.isVerified ? 'Verified' : 'Pending'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button
                                    onClick={() => toggleVerify(user.id, user.isVerified)}
                                    className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white transition"
                                >
                                    {user.isVerified ? 'Revoke' : 'Approve'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Users;
