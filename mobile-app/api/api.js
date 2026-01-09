import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your machine's local IP address (for physical devices)
const LOCAL_IP = '192.168.1.164';

// Determine the correct API URL based on platform
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        // Web browser uses localhost
        return 'http://localhost:3000/api';
    } else if (Platform.OS === 'android') {
        // Use local IP for physical devices (works for both emulator and physical)
        // Note: 10.0.2.2 only works for Android emulator, not physical devices
        return `http://${LOCAL_IP}:3000/api`;
    } else {
        // iOS simulator uses localhost, physical iOS needs local IP
        return `http://${LOCAL_IP}:3000/api`;
    }
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
