import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import QRCode from 'react-native-qrcode-svg';

export default function StudentAuthScreen() {
    const { user, logout } = useAuth();
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [paymentCode, setPaymentCode] = useState(null);
    const [codeExpiry, setCodeExpiry] = useState(0);
    const [generating, setGenerating] = useState(false);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        checkSetup();
    }, []);

    // Countdown timer for code expiry
    useEffect(() => {
        if (codeExpiry > 0) {
            const timer = setInterval(() => {
                setCodeExpiry(prev => {
                    if (prev <= 1) {
                        setPaymentCode(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [codeExpiry]);

    const checkSetup = async () => {
        try {
            // Check if device has biometrics
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            setHasBiometrics(compatible && enrolled);

            // Check if this device is registered on server
            try {
                const res = await api.get('/student/device/verify');
                setIsRegistered(res.data.registered);
                setBalance(res.data.balance || 0);

                // If server says not registered, clear local key
                if (!res.data.registered) {
                    await SecureStore.deleteItemAsync('studentDeviceKey');
                }
            } catch {
                setIsRegistered(false);
            }
        } catch (error) {
            console.error('Setup check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const registerDevice = async () => {
        if (!hasBiometrics) {
            Alert.alert('Not Available', 'Please set up fingerprint or Face ID on your device first');
            return;
        }

        // Authenticate first
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Register this device for payments',
            fallbackLabel: 'Use passcode',
            disableDeviceFallback: false
        });

        if (!result.success) {
            Alert.alert('Authentication Failed', 'Please try again');
            return;
        }

        setLoading(true);
        try {
            // Generate a device key
            const deviceKey = generateDeviceKey();

            // Register with backend
            const res = await api.post('/student/device/register', {
                deviceKey,
                deviceName: 'Mobile Device'
            });

            // Store locally
            await SecureStore.setItemAsync('studentDeviceKey', deviceKey);

            setIsRegistered(true);
            setBalance(res.data.balance || 0);
            Alert.alert('Success', 'Device registered! You can now generate payment codes.');
        } catch (error) {
            Alert.alert('Registration Failed', error.response?.data?.error || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    const generatePaymentCode = async () => {
        // First check if we have a device key
        const deviceKey = await SecureStore.getItemAsync('studentDeviceKey');
        if (!deviceKey) {
            Alert.alert('Device Not Registered', 'Please register your device first.');
            setIsRegistered(false);
            return;
        }

        // Authenticate with biometrics
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to generate payment code',
            fallbackLabel: 'Use passcode',
            disableDeviceFallback: false
        });

        if (!result.success) {
            Alert.alert('Authentication Failed', 'Please try again');
            return;
        }

        setGenerating(true);
        try {
            // Request OTP from backend
            const res = await api.post('/student/generate-otp', { deviceKey });

            setPaymentCode(res.data.otp);
            setCodeExpiry(60); // 60 seconds expiry
            setBalance(res.data.balance || balance);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to generate code';
            if (errorMsg.includes('not registered') || error.response?.status === 403) {
                // Device not registered on server, clear local and prompt re-registration
                await SecureStore.deleteItemAsync('studentDeviceKey');
                setIsRegistered(false);
                Alert.alert('Re-registration Required', 'Please register your device again.');
            } else {
                Alert.alert('Error', errorMsg);
            }
        } finally {
            setGenerating(false);
        }
    };

    const generateDeviceKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2EF2C5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Student<Text style={styles.highlight}>Pay</Text></Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.welcome}>Hello, {user?.name}</Text>
            <Text style={styles.studentId}>ID: {user?.studentId}</Text>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
            </View>

            {!isRegistered ? (
                // Registration View
                <View style={styles.registerSection}>
                    <Text style={styles.sectionTitle}>Setup Biometric Payment</Text>
                    <Text style={styles.sectionDesc}>
                        Register this device to make payments using fingerprint or Face ID instead of PIN.
                    </Text>

                    {!hasBiometrics ? (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                Biometric authentication is not set up on this device.
                                Please enable fingerprint or Face ID in your device settings.
                            </Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.registerBtn} onPress={registerDevice}>
                            <Text style={styles.registerBtnText}>Register Device</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                // Payment Code View
                <View style={styles.paymentSection}>
                    {paymentCode ? (
                        // Show code
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeLabel}>Your Payment Code</Text>
                            <View style={styles.codeBox}>
                                <Text style={styles.codeText}>{paymentCode}</Text>
                            </View>
                            <View style={styles.expiryBar}>
                                <View style={[styles.expiryFill, { width: `${(codeExpiry / 60) * 100}%` }]} />
                            </View>
                            <Text style={styles.expiryText}>Expires in {codeExpiry}s</Text>

                            {/* QR Code with OTP */}
                            <View style={styles.qrContainer}>
                                <QRCode
                                    value={JSON.stringify({
                                        type: 'GUARDIAN_WALLET_OTP',
                                        studentId: user?.studentId,
                                        otp: paymentCode,
                                        name: user?.name
                                    })}
                                    size={150}
                                    backgroundColor="#fff"
                                    color="#000"
                                />
                            </View>
                            <Text style={styles.qrHint}>Vendor can also scan this QR</Text>
                        </View>
                    ) : (
                        // Generate button
                        <View style={styles.generateSection}>
                            <Text style={styles.sectionTitle}>Ready to Pay?</Text>
                            <Text style={styles.sectionDesc}>
                                Tap below and authenticate with fingerprint to generate a one-time payment code.
                            </Text>

                            <TouchableOpacity
                                style={styles.generateBtn}
                                onPress={generatePaymentCode}
                                disabled={generating}
                            >
                                {generating ? (
                                    <ActivityIndicator color="#000" />
                                ) : (
                                    <Text style={styles.generateBtnText}>Generate Payment Code</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>How to Pay</Text>
                <Text style={styles.infoText}>
                    1. Tap "Generate Payment Code"{'\n'}
                    2. Authenticate with fingerprint/Face ID{'\n'}
                    3. Show the code to vendor OR let them scan QR{'\n'}
                    4. Code expires in 60 seconds
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    highlight: { color: '#2EF2C5' },
    logout: { color: 'red', fontSize: 14 },

    welcome: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    studentId: { color: '#888', fontSize: 14, marginBottom: 20 },

    balanceCard: {
        backgroundColor: '#151B2B',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#2EF2C5'
    },
    balanceLabel: { color: '#888', fontSize: 12, marginBottom: 5 },
    balanceValue: { color: '#2EF2C5', fontSize: 36, fontWeight: 'bold' },

    // Registration
    registerSection: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 20 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    sectionDesc: { color: '#888', fontSize: 14, lineHeight: 22, marginBottom: 20 },

    warningBox: { backgroundColor: '#FFB80020', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FFB800' },
    warningText: { color: '#FFB800', fontSize: 13, lineHeight: 20 },

    registerBtn: { backgroundColor: '#2EF2C5', padding: 16, borderRadius: 10, alignItems: 'center' },
    registerBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

    // Payment section
    paymentSection: { flex: 1 },
    generateSection: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 20 },
    generateBtn: { backgroundColor: '#2EF2C5', padding: 20, borderRadius: 15, alignItems: 'center' },
    generateBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

    // Code display
    codeContainer: { backgroundColor: '#151B2B', padding: 25, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
    codeLabel: { color: '#888', fontSize: 14, marginBottom: 15 },
    codeBox: { backgroundColor: '#0B0F1A', paddingHorizontal: 40, paddingVertical: 20, borderRadius: 10, marginBottom: 15 },
    codeText: { color: '#2EF2C5', fontSize: 36, fontWeight: 'bold', letterSpacing: 8 },

    expiryBar: { width: '100%', height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 8 },
    expiryFill: { height: '100%', backgroundColor: '#2EF2C5', borderRadius: 2 },
    expiryText: { color: '#888', fontSize: 12 },

    qrContainer: { marginTop: 20, backgroundColor: '#fff', padding: 15, borderRadius: 10 },
    qrHint: { color: '#666', fontSize: 12, marginTop: 10 },

    infoBox: { backgroundColor: '#151B2B', padding: 15, borderRadius: 10, marginTop: 'auto' },
    infoTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 8, fontSize: 14 },
    infoText: { color: '#888', lineHeight: 22, fontSize: 13 }
});
