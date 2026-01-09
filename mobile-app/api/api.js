import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ============================================
// API CONFIGURATION
// ============================================
// Update LOCAL_IP with your computer's IP address
// To find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)
// Look for "IPv4 Address" under your active network adapter
// 
// Common scenarios:
// - Physical device on same WiFi: Use your computer's local IP (e.g., 192.168.1.9)
// - Android Emulator: Use '10.0.2.2' (special alias for host machine)
// - iOS Simulator: Use 'localhost' or '127.0.0.1'
// ============================================

const LOCAL_IP = '192.168.1.9'; // <-- UPDATE THIS if your IP changes

// Determine the correct API URL based on platform
const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        // Web browser uses localhost
        return 'http://localhost:3000/api';
    } else if (Platform.OS === 'android') {
        // For physical Android devices, use LOCAL_IP
        // For Android Emulator, change LOCAL_IP to '10.0.2.2'
        return `http://${LOCAL_IP}:3000/api`;
    } else {
        // iOS simulator can use localhost, physical iOS needs LOCAL_IP
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
