import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, TextInput, Modal, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import QRCode from 'react-native-qrcode-svg';

export default function ParentDashboard() {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [students, setStudents] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Create student modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentId, setNewStudentId] = useState('');
    const [newStudentPin, setNewStudentPin] = useState('');

    // Transfer modal
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [transferAmount, setTransferAmount] = useState('');

    // Transaction history modal (NEW)
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [studentTransactions, setStudentTransactions] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Spending limit modal (NEW)
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [dailyLimit, setDailyLimit] = useState('');

    // QR Code modal (NEW)
    const [showQRModal, setShowQRModal] = useState(false);

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const walletRes = await api.get('/wallet/balance');

            let balanceValue = 0;
            try {
                const rawBalance = walletRes.data?.balance;
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceValue = Number(rawBalance);
                    if (isNaN(balanceValue)) balanceValue = 0;
                }
            } catch (e) {
                balanceValue = 0;
            }

            setBalance(balanceValue);

            // Fetch my students
            const studentsRes = await api.get('/student');
            const studentList = studentsRes.data || [];

            // Fetch spending limits for each student
            const studentsWithLimits = await Promise.all(studentList.map(async (s) => {
                try {
                    const limitRes = await api.get(`/student/${s.id}/limit`);
                    return {
                        ...s,
                        dailyLimit: limitRes.data.dailyLimit || 0,
                        todaySpent: limitRes.data.todaySpent || 0,
                        remaining: limitRes.data.remaining
                    };
                } catch {
                    return { ...s, dailyLimit: 0, todaySpent: 0, remaining: null };
                }
            }));

            setStudents(studentsWithLimits);
        } catch (error) {
            console.error('ParentDashboard: Error:', error.message);
            setBalance(0);
            setStudents([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddMoney = async () => {
        try {
            await api.post('/wallet/add-money', { amount: 500 });
            Alert.alert('Success', 'Added ₹500 to wallet');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add money');
        }
    };

    const handleCreateStudent = async () => {
        if (!newStudentName.trim() || !newStudentId.trim() || !newStudentPin.trim()) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (!/^\d{4,6}$/.test(newStudentPin)) {
            Alert.alert('Error', 'PIN must be 4-6 digits');
            return;
        }

        try {
            await api.post('/student', {
                name: newStudentName.trim(),
                studentId: newStudentId.trim().toUpperCase(),
                pin: newStudentPin
            });
            Alert.alert('Success', `Student ${newStudentName} created!\n\nStudent ID: ${newStudentId.toUpperCase()}\nPIN: ${newStudentPin}\n\nShare these with your student for vendor payments.`);
            setShowCreateModal(false);
            setNewStudentName('');
            setNewStudentId('');
            setNewStudentPin('');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to create student');
        }
    };

    const handleTransfer = async () => {
        if (!transferAmount || parseFloat(transferAmount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (parseFloat(transferAmount) > balance) {
            Alert.alert('Error', 'Insufficient balance');
            return;
        }

        try {
            await api.post('/student/transfer', {
                studentId: selectedStudent.id,
                amount: parseFloat(transferAmount)
            });
            Alert.alert('Success', `Transferred ₹${transferAmount} to ${selectedStudent.name}`);
            setShowTransferModal(false);
            setTransferAmount('');
            setSelectedStudent(null);
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Transfer failed');
        }
    };

    // Fetch student transaction history (NEW)
    const fetchStudentHistory = async (student) => {
        setSelectedStudent(student);
        setLoadingHistory(true);
        setShowHistoryModal(true);

        try {
            const res = await api.get(`/student/${student.id}/transactions`);
            setStudentTransactions(res.data || []);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            setStudentTransactions([]);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Set spending limit (NEW)
    const handleSetLimit = async () => {
        if (!dailyLimit || parseFloat(dailyLimit) < 0) {
            Alert.alert('Error', 'Please enter a valid daily limit (0 to disable)');
            return;
        }

        try {
            await api.put(`/student/${selectedStudent.id}/limit`, {
                dailyLimit: parseFloat(dailyLimit)
            });
            Alert.alert(
                'Success',
                parseFloat(dailyLimit) > 0
                    ? `Daily limit of ₹${dailyLimit} set for ${selectedStudent.name}`
                    : `Daily limit disabled for ${selectedStudent.name}`
            );
            setShowLimitModal(false);
            setDailyLimit('');
            setSelectedStudent(null);
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to set limit');
        }
    };

    // Fetch spending limit info
    const openLimitModal = async (student) => {
        setSelectedStudent(student);
        setDailyLimit('');
        setShowLimitModal(true);

        try {
            const res = await api.get(`/student/${student.id}/limit`);
            if (res.data.dailyLimit > 0) {
                setDailyLimit(res.data.dailyLimit.toString());
            }
        } catch (error) {
            console.log('No existing limit');
        }
    };

    const openTransferModal = (student) => {
        setSelectedStudent(student);
        setTransferAmount('');
        setShowTransferModal(true);
    };

    // Calculate total spent today
    const getTodaySpent = (transactions) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return transactions
            .filter(t => t.type === 'PAYMENT' && new Date(t.createdAt) >= today)
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    };

    const renderStudentItem = ({ item }) => (
        <View style={styles.studentCard}>
            <View style={styles.studentHeader}>
                <View>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentIdText}>ID: {item.studentId}</Text>
                </View>
                <View style={styles.studentBalanceContainer}>
                    <Text style={styles.studentBalance}>₹{(item.walletBalance || 0).toFixed(2)}</Text>
                    <Text style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.activeStatus : styles.blockedStatus]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            {/* Spending Info */}
            {item.dailyLimit > 0 && (
                <View style={styles.spendingInfo}>
                    <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Today's Spending:</Text>
                        <Text style={styles.spendingValue}>₹{(item.todaySpent || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.spendingRow}>
                        <Text style={styles.spendingLabel}>Daily Limit:</Text>
                        <Text style={styles.limitValue}>₹{item.dailyLimit.toFixed(2)}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, {
                            width: `${Math.min(100, (item.todaySpent / item.dailyLimit) * 100)}%`,
                            backgroundColor: item.todaySpent >= item.dailyLimit ? '#FF6B6B' : '#2EF2C5'
                        }]} />
                    </View>
                </View>
            )}

            {/* Action Buttons Row 1 */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.transferActionBtn]}
                    onPress={() => openTransferModal(item)}
                >
                    <Text style={styles.actionBtnText}>+ Transfer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.qrActionBtn]}
                    onPress={() => { setSelectedStudent(item); setShowQRModal(true); }}
                >
                    <Text style={styles.actionBtnText}>Show QR</Text>
                </TouchableOpacity>
            </View>

            {/* Action Buttons Row 2 */}
            <View style={[styles.actionRow, { marginTop: 8 }]}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.historyActionBtn]}
                    onPress={() => fetchStudentHistory(item)}
                >
                    <Text style={styles.actionBtnTextLight}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.limitActionBtn]}
                    onPress={() => openLimitModal(item)}
                >
                    <Text style={styles.actionBtnTextLight}>Set Limit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTransactionItem = ({ item }) => {
        const isPayment = item.type === 'PAYMENT';
        const isTransfer = item.type === 'TRANSFER';

        return (
            <View style={styles.txItem}>
                <View style={styles.txLeft}>
                    <Text style={styles.txType}>
                        {isPayment ? 'Payment to Vendor' : isTransfer ? 'Received from Guardian' : item.type}
                    </Text>
                    <Text style={styles.txDesc}>{item.description || 'No description'}</Text>
                    <Text style={styles.txDate}>
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                    </Text>
                </View>
                <Text style={[styles.txAmount, isPayment ? styles.txAmountRed : styles.txAmountGreen]}>
                    {isPayment ? '-' : '+'}₹{parseFloat(item.amount).toFixed(2)}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Hello, {user?.name}</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>My Wallet Balance</Text>
                <Text style={styles.balanceValue}>₹{(balance || 0).toFixed(2)}</Text>
                <TouchableOpacity style={styles.addMoneyBtn} onPress={handleAddMoney}>
                    <Text style={styles.addMoneyText}>+ Add Money (₹500)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Students ({students.length})</Text>
                <TouchableOpacity style={styles.addStudentBtn} onPress={() => setShowCreateModal(true)}>
                    <Text style={styles.addStudentBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={students}
                renderItem={renderStudentItem}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.empty}>No students yet</Text>
                        <Text style={styles.emptySubtext}>Tap "+ Add" to create one</Text>
                    </View>
                }
            />

            {/* Create Student Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Student</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Student Name"
                            placeholderTextColor="#666"
                            value={newStudentName}
                            onChangeText={setNewStudentName}
                        />

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Student ID (College Roll No)"
                            placeholderTextColor="#666"
                            value={newStudentId}
                            onChangeText={setNewStudentId}
                            autoCapitalize="characters"
                        />

                        <TextInput
                            style={styles.modalInput}
                            placeholder="PIN (4-6 digits)"
                            placeholderTextColor="#666"
                            value={newStudentPin}
                            onChangeText={setNewStudentPin}
                            keyboardType="numeric"
                            maxLength={6}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCreateStudent}>
                                <Text style={styles.modalConfirmText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Transfer Modal */}
            <Modal visible={showTransferModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Transfer to {selectedStudent?.name}</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#666"
                            value={transferAmount}
                            onChangeText={setTransferAmount}
                            keyboardType="decimal-pad"
                        />

                        <Text style={styles.availableText}>Available: ₹{balance.toFixed(2)}</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowTransferModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleTransfer}>
                                <Text style={styles.modalConfirmText}>Transfer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* QR Code Modal (NEW) */}
            <Modal visible={showQRModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.qrModal]}>
                        <Text style={styles.modalTitle}>Student QR Code</Text>
                        <Text style={styles.qrStudentName}>{selectedStudent?.name}</Text>

                        <View style={styles.qrContainer}>
                            {selectedStudent && (
                                <QRCode
                                    value={JSON.stringify({
                                        type: 'GUARDIAN_WALLET_STUDENT',
                                        studentId: selectedStudent.studentId,
                                        name: selectedStudent.name
                                    })}
                                    size={200}
                                    backgroundColor="#fff"
                                    color="#000"
                                />
                            )}
                        </View>

                        <Text style={styles.qrIdText}>ID: {selectedStudent?.studentId}</Text>
                        <Text style={styles.qrHint}>
                            Show this QR code to vendors for quick payments.{'\n'}
                            Student must also provide their PIN.
                        </Text>

                        <TouchableOpacity
                            style={styles.qrCloseBtn}
                            onPress={() => setShowQRModal(false)}
                        >
                            <Text style={styles.qrCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Spending Limit Modal (NEW) */}
            <Modal visible={showLimitModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Set Daily Limit</Text>
                        <Text style={styles.modalSubtitle}>
                            Limit daily spending for {selectedStudent?.name}
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Daily Limit (₹)"
                            placeholderTextColor="#666"
                            value={dailyLimit}
                            onChangeText={setDailyLimit}
                            keyboardType="decimal-pad"
                        />

                        <Text style={styles.limitHint}>
                            Enter 0 to disable the daily limit
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLimitModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleSetLimit}>
                                <Text style={styles.modalConfirmText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Transaction History Modal (NEW) */}
            <Modal visible={showHistoryModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, styles.historyModal]}>
                        <View style={styles.historyHeader}>
                            <Text style={styles.modalTitle}>{selectedStudent?.name}'s Expenses</Text>
                            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                                <Text style={styles.closeBtn}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingHistory ? (
                            <Text style={styles.loadingText}>Loading transactions...</Text>
                        ) : studentTransactions.length === 0 ? (
                            <View style={styles.noTxContainer}>
                                <Text style={styles.noTxText}>No transactions yet</Text>
                                <Text style={styles.noTxSubtext}>Transactions will appear here when your student makes payments</Text>
                            </View>
                        ) : (
                            <>
                                {/* Summary */}
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Total Spent</Text>
                                        <Text style={styles.summaryValueRed}>
                                            ₹{studentTransactions
                                                .filter(t => t.type === 'PAYMENT')
                                                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
                                                .toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryItem}>
                                        <Text style={styles.summaryLabel}>Today</Text>
                                        <Text style={styles.summaryValueRed}>
                                            ₹{getTodaySpent(studentTransactions).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                <FlatList
                                    data={studentTransactions}
                                    renderItem={renderTransactionItem}
                                    keyExtractor={item => item.id}
                                    style={styles.txList}
                                />
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    welcome: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    logout: { color: 'red' },

    balanceCard: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#2EF2C5' },
    balanceLabel: { color: '#888', marginBottom: 5 },
    balanceValue: { color: '#2EF2C5', fontSize: 36, fontWeight: 'bold' },
    addMoneyBtn: { marginTop: 15, backgroundColor: '#2EF2C5', padding: 10, borderRadius: 8, alignItems: 'center' },
    addMoneyText: { color: '#000', fontWeight: 'bold' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    addStudentBtn: { backgroundColor: '#2EF2C5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
    addStudentBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },

    studentCard: { backgroundColor: '#151B2B', padding: 15, borderRadius: 12, marginBottom: 10 },
    studentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },

    // Spending info styles
    spendingInfo: { backgroundColor: '#0B0F1A', padding: 10, borderRadius: 8, marginBottom: 12 },
    spendingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    spendingLabel: { color: '#666', fontSize: 12 },
    spendingValue: { color: '#FF6B6B', fontSize: 12, fontWeight: '600' },
    limitValue: { color: '#FFB800', fontSize: 12, fontWeight: '600' },
    progressBar: { height: 4, backgroundColor: '#222', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    studentName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    studentIdText: { color: '#888', fontSize: 12, marginTop: 2 },
    studentBalanceContainer: { alignItems: 'flex-end' },
    studentBalance: { color: '#2EF2C5', fontWeight: 'bold', fontSize: 18 },
    statusBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, overflow: 'hidden' },
    activeStatus: { backgroundColor: 'rgba(46, 242, 197, 0.2)', color: '#2EF2C5' },
    blockedStatus: { backgroundColor: 'rgba(255, 68, 68, 0.2)', color: '#FF4444' },

    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
    transferActionBtn: { backgroundColor: '#2EF2C5' },
    qrActionBtn: { backgroundColor: '#8B5CF6' },
    historyActionBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
    limitActionBtn: { backgroundColor: '#333', borderWidth: 1, borderColor: '#FFB800' },
    actionBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
    actionBtnTextLight: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

    emptyContainer: { alignItems: 'center', marginTop: 40 },
    empty: { color: '#666', fontSize: 16 },
    emptySubtext: { color: '#444', fontSize: 12, marginTop: 5 },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#151B2B', borderRadius: 15, padding: 20 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    modalSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 },
    limitHint: { color: '#666', fontSize: 12, textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },
    modalInput: {
        backgroundColor: '#0B0F1A',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        padding: 15,
        color: '#fff',
        fontSize: 16,
        marginBottom: 12
    },
    availableText: { color: '#888', textAlign: 'center', marginBottom: 15 },
    modalActions: { flexDirection: 'row', marginTop: 10 },
    modalCancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#333', borderRadius: 8, marginRight: 10 },
    modalCancelText: { color: '#fff', fontWeight: 'bold' },
    modalConfirmBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#2EF2C5', borderRadius: 8 },
    modalConfirmText: { color: '#000', fontWeight: 'bold' },

    // History Modal styles (NEW)
    historyModal: { maxHeight: '80%' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    closeBtn: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold' },
    loadingText: { color: '#888', textAlign: 'center', padding: 30 },
    noTxContainer: { alignItems: 'center', padding: 30 },
    noTxText: { color: '#666', fontSize: 16 },
    noTxSubtext: { color: '#444', fontSize: 12, marginTop: 8, textAlign: 'center' },

    summaryRow: { flexDirection: 'row', marginBottom: 15 },
    summaryItem: { flex: 1, backgroundColor: '#0B0F1A', padding: 12, borderRadius: 8, marginHorizontal: 5, alignItems: 'center' },
    summaryLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
    summaryValueRed: { color: '#FF6B6B', fontSize: 18, fontWeight: 'bold' },

    txList: { maxHeight: 300 },
    txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
    txLeft: { flex: 1 },
    txType: { color: '#fff', fontSize: 14, fontWeight: '600' },
    txDesc: { color: '#888', fontSize: 12, marginTop: 2 },
    txDate: { color: '#555', fontSize: 11, marginTop: 4 },
    txAmount: { fontSize: 16, fontWeight: 'bold' },
    txAmountRed: { color: '#FF6B6B' },
    txAmountGreen: { color: '#2EF2C5' },

    // QR Modal styles (NEW)
    qrModal: { alignItems: 'center' },
    qrStudentName: { color: '#2EF2C5', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    qrContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15 },
    qrIdText: { color: '#888', fontSize: 14, marginBottom: 10 },
    qrHint: { color: '#666', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    qrCloseBtn: { backgroundColor: '#333', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 8 },
    qrCloseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});
