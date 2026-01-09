import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
            <div className="bg-[#151B2B] p-8 rounded-lg shadow-lg w-full max-w-md border border-[#2EF2C5]/20">
                <h2 className="text-3xl font-bold text-[#2EF2C5] mb-6 text-center">Admin Access</h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 mb-2 text-sm">Email Address</label>
                        <input
                            type="email"
                            className="w-full bg-[#0B0F1A] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-[#2EF2C5]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2 text-sm">Password</label>
                        <input
                            type="password"
                            className="w-full bg-[#0B0F1A] border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-[#2EF2C5]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-[#2EF2C5] text-black font-bold py-3 rounded hover:bg-[#26D9B0] transition-colors"
                    >
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
