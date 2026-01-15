import React, { useEffect, useState } from 'react';
import api from '../api';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        try {
            const { data } = await api.get('/student/all');
            setStudents(data);
        } catch (error) {
            console.error('Failed to fetch students', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Student Management</h2>
                <p className="text-gray-400 text-sm">
                    Students are created by Guardians. They do not have login access - only a PIN for vendor transactions.
                </p>
            </div>

            <div className="bg-[#151B2B] rounded-lg border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#0B0F1A] text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Student ID</th>
                            <th className="px-6 py-4">Guardian</th>
                            <th className="px-6 py-4">Balance</th>
                            <th className="px-6 py-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-300 divide-y divide-gray-800">
                        {students.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    No students yet. Guardians create students from their dashboard.
                                </td>
                            </tr>
                        ) : (
                            students.map(student => (
                                <tr key={student.id} className="hover:bg-gray-800/50">
                                    <td className="px-6 py-4 font-medium text-white">{student.name}</td>
                                    <td className="px-6 py-4 text-[#2EF2C5] font-mono">{student.studentId}</td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="text-white">{student.guardianName}</div>
                                            <div className="text-gray-500 text-xs">{student.guardianEmail}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[#2EF2C5] font-semibold">
                                        ₹{(student.walletBalance || 0).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            student.status === 'ACTIVE'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 bg-[#151B2B] rounded-lg border border-gray-800 p-6">
                <h3 className="text-white font-semibold mb-3">How Student Transactions Work</h3>
                <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
                    <li>Guardian creates a student with a unique Student ID and PIN</li>
                    <li>Guardian transfers money to the student's wallet</li>
                    <li>Student gives their Student ID and PIN to the vendor</li>
                    <li>Vendor enters Student ID + PIN + Amount in their dashboard</li>
                    <li>Transaction is processed and recorded</li>
                </ol>
            </div>
        </div>
    );
};

export default Students;
