import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [requestAmount, setRequestAmount] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const res = await api.get('/wallet/balance');
            console.log('StudentDashboard: Response:', JSON.stringify(res.data));

            // Safe number conversion
            let balanceValue = 0;
            try {
                const rawBalance = res.data?.balance;
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceValue = Number(rawBalance);
                    if (isNaN(balanceValue)) balanceValue = 0;
                }
            } catch (e) {
                console.error('Balance parse error:', e);
                balanceValue = 0;
            }

            console.log('StudentDashboard: Balance:', balanceValue);
            setBalance(balanceValue);
        } catch (error) {
            console.error('StudentDashboard: Error:', error.message);
            setBalance(0);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePay = async () => {
        // Simulating QR Scan Result
        const mockVendorId = 'vendor-123'; // Logic needs real vendor ID
        // In a real app, camera opens -> scans URL/ID -> extract vendorId

        // For demo, we just trigger a payment of 50 to a random or hardcoded vendor?
        // We need a valid vendor ID. The backend Mock DB has empty vendors mostly.
        // Let's prompt for vendor ID or just fail gracefully if none.

        Alert.prompt(
            "Simulate Payment",
            "Enter Vendor ID (or leave empty to settle with 'vendor1')",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Pay ₹50",
                    onPress: async (vendorId) => {
                        // We need to implement lookup or just send raw ID
                        try {
                            // Assuming we pay 50
                            await api.post('/wallet/pay', { vendorId: vendorId || 'vendor1', amount: 50 });
                            Alert.alert('Success', 'Payment Successful');
                            fetchData();
                        } catch (e) {
                            Alert.alert('Failed', e.response?.data?.error || 'Payment failed');
                        }
                    }
                }
            ]
        );
    };

    const handleRequestMoney = async () => {
        if (!requestAmount) return;
        try {
            await api.post('/request/create', { amount: parseFloat(requestAmount), reason: 'Pocket Money' });
            Alert.alert('Sent', 'Money Request Sent to Guardian');
            setRequestAmount('');
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to send request');
        }
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        >
            <View style={styles.header}>
                <Text style={styles.welcome}>Student: {user?.name}</Text>
                <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>My Balance</Text>
                <Text style={styles.balance}>₹{(balance || 0).toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.scanBtn} onPress={handlePay}>
                <Text style={styles.scanText}>[ ] Scan QR & Pay</Text>
            </TouchableOpacity>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Money</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Amount (₹)"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={requestAmount}
                        onChangeText={setRequestAmount}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleRequestMoney}>
                        <Text style={styles.sendText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    welcome: { color: '#fff', fontSize: 18 },
    logout: { color: 'red' },

    card: { backgroundColor: '#151B2B', padding: 30, borderRadius: 20, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#2EF2C5' },
    label: { color: '#888', marginBottom: 10 },
    balance: { color: '#2EF2C5', fontSize: 40, fontWeight: 'bold' },

    scanBtn: { backgroundColor: '#2EF2C5', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 40 },
    scanText: { color: '#000', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },

    section: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15 },
    sectionTitle: { color: '#fff', marginBottom: 15, fontSize: 16 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
    input: { flex: 1, backgroundColor: '#0B0F1A', color: '#fff', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#333', marginRight: 10 },
    sendBtn: { backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10 },
    sendText: { color: '#fff' }
});
