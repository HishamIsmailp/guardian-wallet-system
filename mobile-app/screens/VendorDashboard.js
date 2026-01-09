import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function VendorDashboard() {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const res = await api.get('/wallet/balance');
            console.log('VendorDashboard: Response:', JSON.stringify(res.data));

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

            setBalance(balanceValue);
        } catch (error) {
            console.error('VendorDashboard: Error:', error.message);
            setBalance(0);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleWithdraw = async () => {
        if (balance <= 0) {
            Alert.alert('Error', 'Insufficient balance');
            return;
        }
        try {
            await api.post('/vendor/withdrawal', { amount: balance });
            Alert.alert('Success', 'Withdrawal request sent to Admin');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Withdrawal failed');
        }
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        >
            <View style={styles.header}>
                <Text style={styles.welcome}>Vendor: {user?.storeName || user?.name}</Text>
                <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
            </View>

            <View style={styles.earningCard}>
                <Text style={styles.label}>Total Earnings</Text>
                <Text style={styles.balance}>₹{(balance || 0).toFixed(2)}</Text>
                <Text style={styles.subtext}>Available for Settlement</Text>
            </View>

            <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
                <Text style={styles.withdrawText}>Request Settlement</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>Settlement Policy</Text>
                <Text style={styles.infoText}>
                    Withdrawals are processed by the college admin within 24 hours.
                    Please ensure your bank details are updated with the administration.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    welcome: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    logout: { color: 'red' },

    earningCard: { backgroundColor: '#151B2B', padding: 40, borderRadius: 20, alignItems: 'center', marginBottom: 40 },
    label: { color: '#888', marginBottom: 10, fontSize: 16 },
    balance: { color: '#2EF2C5', fontSize: 48, fontWeight: 'bold' },
    subtext: { color: '#666', marginTop: 10 },

    withdrawBtn: { backgroundColor: '#2EF2C5', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
    withdrawText: { color: '#000', fontSize: 18, fontWeight: 'bold' },

    infoBox: { backgroundColor: '#151B2B', padding: 20, borderRadius: 10 },
    infoTitle: { color: '#fff', fontWeight: 'bold', marginBottom: 10 },
    infoText: { color: '#888', lineHeight: 20 }
});
