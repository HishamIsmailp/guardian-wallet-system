import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Auto-detect the dev server IP from Expo so you never need to update manually
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:3000/api';
    }

    // Expo provides the dev server host (e.g. "192.168.1.9:8081")
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (debuggerHost) {
        const ip = debuggerHost.split(':')[0]; // strip the Expo port
        return `http://${ip}:3000/api`;
    }

    // Fallback for Android emulator
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000/api';
    }

    return 'http://localhost:3000/api';
};

const BASE_URL = getBaseUrl();

console.log('API configured with base URL:', BASE_URL);

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to log all API responses
api.interceptors.response.use(
    (response) => {
        console.log('API Response:', response.config.url, JSON.stringify(response.data));
        return response;
    },
    (error) => {
        console.error('API Error:', error.config?.url, error.message);
        return Promise.reject(error);
    }
);

export default api;
