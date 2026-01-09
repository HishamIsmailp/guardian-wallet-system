import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

export default function ParentDashboard() {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [requests, setRequests] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const walletRes = await api.get('/wallet/balance');
            console.log('ParentDashboard: Response:', JSON.stringify(walletRes.data));

            // Safe number conversion
            let balanceValue = 0;
            try {
                const rawBalance = walletRes.data?.balance;
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceValue = Number(rawBalance);
                    if (isNaN(balanceValue)) balanceValue = 0;
                }
            } catch (e) {
                console.error('Balance parse error:', e);
                balanceValue = 0;
            }

            setBalance(balanceValue);

            const reqRes = await api.get('/request/list');
            setRequests(reqRes.data || []);
        } catch (error) {
            console.error('ParentDashboard: Error:', error.message);
            setBalance(0);
            setRequests([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddMoney = async () => {
        try {
            await api.post('/wallet/add-money', { amount: 500 }); // Mock amount for demo
            Alert.alert('Success', 'Added ₹500 to wallet');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add money');
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/request/${id}/approve`);
            Alert.alert('Success', 'Request Checked & Approved');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async (id) => {
        try {
            await api.post(`/request/${id}/reject`);
            Alert.alert('Rejected', 'Request rejected');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed');
        }
    };

    const renderRequestItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Request from {item.student?.name || 'Student'}</Text>
                <Text style={styles.amount}>₹{(Number(item.amount) || 0).toFixed(2)}</Text>
            </View>
            <Text style={styles.reason}>{item.reason || 'No reason provided'}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>

            {item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => handleApprove(item.id)}
                    >
                        <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => handleReject(item.id)}
                    >
                        <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Hello, {user?.name}</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Wallet Balance</Text>
                <Text style={styles.balanceValue}>₹{(balance || 0).toFixed(2)}</Text>
                <TouchableOpacity style={styles.addMoneyBtn} onPress={handleAddMoney}>
                    <Text style={styles.addMoneyText}>+ Add Money (₹500)</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Money Requests</Text>
            <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
                ListEmptyComponent={<Text style={styles.empty}>No active requests</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    welcome: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    logout: { color: 'red' },

    balanceCard: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 30, borderWidth: 1, borderColor: '#2EF2C5' },
    balanceLabel: { color: '#888', marginBottom: 5 },
    balanceValue: { color: '#2EF2C5', fontSize: 36, fontWeight: 'bold' },
    addMoneyBtn: { marginTop: 15, backgroundColor: '#2EF2C5', padding: 10, borderRadius: 8, alignItems: 'center' },
    addMoneyText: { color: '#000', fontWeight: 'bold' },

    sectionTitle: { color: '#fff', fontSize: 20, marginBottom: 15, fontWeight: 'bold' },

    card: { backgroundColor: '#151B2B', padding: 15, borderRadius: 10, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    cardTitle: { color: '#fff', fontWeight: 'bold' },
    amount: { color: '#2EF2C5', fontWeight: 'bold', fontSize: 16 },
    reason: { color: '#ccc', fontSize: 13, marginBottom: 5 },
    status: { color: '#888', fontSize: 12, marginBottom: 10 },

    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    actionBtn: { flex: 1, padding: 8, borderRadius: 5, alignItems: 'center', marginHorizontal: 5 },
    approveBtn: { backgroundColor: '#2EF2C5' },
    rejectBtn: { backgroundColor: '#FF4444' },
    btnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

    empty: { color: '#666', textAlign: 'center', marginTop: 20 }
});
