import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Students from './pages/Students';
import Transactions from './pages/Transactions';
import Vendors from './pages/Vendors';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={<DashboardLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="users" element={<Users />} />
                        <Route path="students" element={<Students />} />
                        <Route path="transactions" element={<Transactions />} />
                        <Route path="vendors" element={<Vendors />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="audit-logs" element={<AuditLogs />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
