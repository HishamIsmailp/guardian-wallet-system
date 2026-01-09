import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    async function loadStorageData() {
        try {
            const userJson = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('token');

            if (userJson && token) {
                setUser(JSON.parse(userJson));
            }
        } catch (e) {
            console.log('Failed to load user', e);
        } finally {
            setLoading(false);
        }
    }

    const login = async (email, password) => {
        try {
            console.log('Attempting login for:', email);
            console.log('API Base URL:', api.defaults.baseURL);

            const response = await api.post('/auth/login', { email, password });
            console.log('Login response received:', response.status);

            const { user, accessToken, refreshToken } = response.data;

            setUser(user);
            await AsyncStorage.setItem('user', JSON.stringify(user));
            await AsyncStorage.setItem('token', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);

            return { success: true };
        } catch (error) {
            console.log('Login error details:', {
                message: error.message,
                code: error.code,
                response: error.response?.data,
                status: error.response?.status
            });

            // Better error messages
            let message = 'Login failed';
            if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
                message = 'Cannot connect to server. Check your network connection.';
            } else if (error.response?.data?.error) {
                message = error.response.data.error;
            } else if (error.response?.status === 401) {
                message = 'Invalid email or password';
            }

            return { success: false, message };
        }
    };

    const logout = async () => {
        setUser(null);
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('refreshToken');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
