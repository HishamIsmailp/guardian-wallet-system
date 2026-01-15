import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ to, label, active }) => (
    <Link
        to={to}
        className={`block py-2.5 px-4 rounded transition duration-200 ${active ? 'bg-[#2EF2C5]/20 text-[#2EF2C5]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
    >
        {label}
    </Link>
);

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <div className="min-h-screen bg-[#0B0F1A] flex">
            {/* Sidebar */}
            <div className="w-64 h-screen bg-[#151B2B] flex flex-col border-r border-gray-800 sticky top-0">
                <div className="p-6 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-[#2EF2C5]">Guardian<span className="text-white">Admin</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    <SidebarItem to="/dashboard" label="Dashboard" active={location.pathname === '/dashboard'} />
                    <SidebarItem to="/users" label="Users (Guardians/Vendors)" active={location.pathname === '/users'} />
                    <SidebarItem to="/students" label="Students" active={location.pathname === '/students'} />
                    <SidebarItem to="/transactions" label="Transactions" active={location.pathname === '/transactions'} />
                    <SidebarItem to="/vendors" label="Vendors" active={location.pathname === '/vendors'} />
                    <SidebarItem to="/reports" label="Reports" active={location.pathname === '/reports'} />
                    <SidebarItem to="/audit-logs" label="Audit Logs" active={location.pathname === '/audit-logs'} />
                </nav>

                <div className="p-4 border-t border-gray-800 flex-shrink-0">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 rounded-full bg-[#2EF2C5] flex items-center justify-center text-black font-bold text-lg">
                            {user.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                            <p className="text-white text-sm font-medium">{user.name}</p>
                            <p className="text-gray-500 text-xs">Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-all duration-200 font-medium text-sm group"
                    >
                        <svg
                            className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <header className="bg-[#151B2B] border-b border-gray-800 p-6">
                    <h2 className="text-xl text-white font-semibold capitalize">
                        {location.pathname.replace('/', '')}
                    </h2>
                </header>
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
