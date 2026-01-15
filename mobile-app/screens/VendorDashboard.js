import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, RefreshControl, ScrollView, TextInput, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function VendorDashboard() {
    const { user, logout } = useAuth();
    const [balance, setBalance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });

    // Tab state
    const [activeTab, setActiveTab] = useState('payment'); // 'payment', 'menu', 'history'

    // Transaction form state
    const [studentId, setStudentId] = useState('');
    const [pin, setPin] = useState('');
    const [otp, setOtp] = useState('');
    const [amount, setAmount] = useState('');
    const [useOtp, setUseOtp] = useState(false);
    const [scannedName, setScannedName] = useState('');

    // Item-based billing state
    const [cart, setCart] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [showItemSelector, setShowItemSelector] = useState(false);

    // Menu management state
    const [showAddItem, setShowAddItem] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');
    const [savingItem, setSavingItem] = useState(false);

    // QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const fetchData = async () => {
        try {
            setRefreshing(true);

            // Fetch balance, transactions, and menu in parallel
            const [balanceRes, txRes, menuRes] = await Promise.all([
                api.get('/wallet/balance'),
                api.get('/vendor/transactions').catch(() => ({ data: [] })),
                api.get('/menu').catch(() => ({ data: [] }))
            ]);

            // Parse balance
            let balanceValue = 0;
            try {
                const rawBalance = balanceRes.data?.balance;
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceValue = Number(rawBalance);
                    if (isNaN(balanceValue)) balanceValue = 0;
                }
            } catch (e) {
                balanceValue = 0;
            }
            setBalance(balanceValue);

            // Parse transactions
            const txList = Array.isArray(txRes.data) ? txRes.data : [];
            setTransactions(txList);

            // Parse menu items
            const menu = Array.isArray(menuRes.data) ? menuRes.data : [];
            setMenuItems(menu);

            // Calculate today's stats
            const today = new Date().toDateString();
            const todayTx = txList.filter(tx => new Date(tx.createdAt).toDateString() === today);
            setTodayStats({
                count: todayTx.length,
                total: todayTx.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
            });
        } catch (error) {
            console.error('VendorDashboard: Error:', error.message);
            setBalance(0);
            setTransactions([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Cart functions
    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (itemId) => {
        const existing = cart.find(c => c.id === itemId);
        if (existing && existing.quantity > 1) {
            setCart(cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
        } else {
            setCart(cart.filter(c => c.id !== itemId));
        }
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

    // Process payment using Student ID + PIN or OTP
    const handleTransaction = async () => {
        if (!studentId.trim()) {
            Alert.alert('Error', 'Please enter Student ID');
            return;
        }
        if (useOtp) {
            if (!otp.trim()) {
                Alert.alert('Error', 'Please enter OTP code');
                return;
            }
        } else {
            if (!pin.trim()) {
                Alert.alert('Error', 'Please enter PIN');
                return;
            }
        }

        // Check if using items or manual amount
        const finalAmount = cart.length > 0 ? cartTotal : parseFloat(amount);
        if (!finalAmount || finalAmount <= 0) {
            Alert.alert('Error', 'Please add items or enter amount');
            return;
        }

        setProcessing(true);
        try {
            const payload = {
                studentId: studentId.trim()
            };

            if (useOtp) {
                payload.otp = otp.trim();
            } else {
                payload.pin = pin.trim();
            }

            // If cart has items, send items; otherwise send amount
            if (cart.length > 0) {
                payload.items = cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: item.quantity
                }));
            } else {
                payload.amount = finalAmount;
            }

            const res = await api.post('/vendor/transaction', payload);

            // Build success message
            let message = `Received ₹${finalAmount.toFixed(2)} from ${res.data.transaction.studentName}`;
            if (cart.length > 0) {
                message += '\n\nItems:\n' + cart.map(i => `• ${i.name} x${i.quantity}`).join('\n');
            }

            Alert.alert('Payment Successful', message, [{ text: 'OK' }]);

            // Clear form and refresh
            setStudentId('');
            setPin('');
            setOtp('');
            setAmount('');
            setCart([]);
            setUseOtp(false);
            setScannedName('');
            fetchData();
        } catch (error) {
            Alert.alert('Payment Failed', error.response?.data?.error || 'Transaction failed');
        } finally {
            setProcessing(false);
        }
    };

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

    // Menu Management functions
    const handleSaveMenuItem = async () => {
        if (!newItemName.trim() || !newItemPrice.trim()) {
            Alert.alert('Error', 'Name and price are required');
            return;
        }

        setSavingItem(true);
        try {
            if (editingItem) {
                await api.put(`/menu/${editingItem.id}`, {
                    name: newItemName.trim(),
                    price: parseFloat(newItemPrice),
                    category: newItemCategory.trim() || 'General'
                });
                Alert.alert('Success', 'Item updated');
            } else {
                await api.post('/menu', {
                    name: newItemName.trim(),
                    price: parseFloat(newItemPrice),
                    category: newItemCategory.trim() || 'General'
                });
                Alert.alert('Success', 'Item added');
            }
            setShowAddItem(false);
            setEditingItem(null);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemCategory('');
            fetchData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to save item');
        } finally {
            setSavingItem(false);
        }
    };

    const handleDeleteMenuItem = async (item) => {
        Alert.alert(
            'Delete Item',
            `Delete "${item.name}" from menu?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/menu/${item.id}`);
                            fetchData();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete item');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleAvailability = async (item) => {
        try {
            await api.patch(`/menu/${item.id}/toggle`);
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update availability');
        }
    };

    const openEditItem = (item) => {
        setEditingItem(item);
        setNewItemName(item.name);
        setNewItemPrice(String(parseFloat(item.price)));
        setNewItemCategory(item.category || '');
        setShowAddItem(true);
    };

    // QR Scanner functions
    const openScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes');
                return;
            }
        }
        setShowScanner(true);
    };

    const handleBarCodeScanned = ({ data }) => {
        try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'GUARDIAN_WALLET_OTP' && parsed.studentId && parsed.otp) {
                setStudentId(parsed.studentId);
                setOtp(parsed.otp);
                setScannedName(parsed.name || '');
                setUseOtp(true);
                setPin('');
                setShowScanner(false);
                Alert.alert(
                    'Student Verified',
                    `${parsed.name || 'Student'}\nID: ${parsed.studentId}\n\nBiometric verified! Add items or enter amount.`
                );
            } else if (parsed.type === 'GUARDIAN_WALLET_STUDENT' && parsed.studentId) {
                setStudentId(parsed.studentId);
                setScannedName(parsed.name || '');
                setUseOtp(false);
                setOtp('');
                setShowScanner(false);
                Alert.alert('Student Found', `${parsed.name || 'Student'}\nID: ${parsed.studentId}\n\nEnter PIN and add items.`);
            } else {
                Alert.alert('Invalid QR', 'This is not a valid Guardian Wallet QR code');
            }
        } catch {
            Alert.alert('Invalid QR', 'Could not read QR code data');
        }
    };

    // Group menu items by category
    const groupedMenuItems = menuItems.reduce((acc, item) => {
        const cat = item.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    // Available items only for item selector
    const availableItems = menuItems.filter(item => item.available);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
        >
            <View style={styles.header}>
                <Text style={styles.welcome}>Vendor: {user?.storeName || user?.name}</Text>
                <TouchableOpacity onPress={logout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Earnings</Text>
                    <Text style={styles.statValue}>₹{(balance || 0).toFixed(2)}</Text>
                </View>
                <View style={[styles.statCard, styles.todayCard]}>
                    <Text style={styles.statLabel}>Today</Text>
                    <Text style={styles.todayValue}>₹{todayStats.total.toFixed(2)}</Text>
                    <Text style={styles.todayCount}>{todayStats.count} sales</Text>
                </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'payment' && styles.tabActive]}
                    onPress={() => setActiveTab('payment')}
                >
                    <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>Payment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'menu' && styles.tabActive]}
                    onPress={() => setActiveTab('menu')}
                >
                    <Text style={[styles.tabText, activeTab === 'menu' && styles.tabTextActive]}>Menu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
                </TouchableOpacity>
            </View>

            {/* Payment Tab */}
            {activeTab === 'payment' && (
                <>
                    <View style={styles.transactionBox}>
                        <View style={styles.formHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>New Sale</Text>
                                <Text style={styles.sectionSubtitle}>Scan QR or enter details</Text>
                            </View>
                            <TouchableOpacity style={styles.scanBtn} onPress={openScanner}>
                                <Text style={styles.scanBtnText}>Scan QR</Text>
                            </TouchableOpacity>
                        </View>

                        {scannedName ? (
                            <View style={styles.scannedInfo}>
                                <Text style={styles.scannedLabel}>Student:</Text>
                                <Text style={styles.scannedName}>{scannedName}</Text>
                            </View>
                        ) : null}

                        <TextInput
                            style={styles.input}
                            placeholder="Student ID"
                            placeholderTextColor="#666"
                            value={studentId}
                            onChangeText={(text) => { setStudentId(text); setScannedName(''); setUseOtp(false); setOtp(''); }}
                            autoCapitalize="characters"
                        />

                        {/* Auth toggle */}
                        <View style={styles.authToggle}>
                            <TouchableOpacity
                                style={[styles.authOption, !useOtp && styles.authOptionActive]}
                                onPress={() => { setUseOtp(false); setOtp(''); }}
                            >
                                <Text style={[styles.authOptionText, !useOtp && styles.authOptionTextActive]}>PIN</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.authOption, useOtp && styles.authOptionActive]}
                                onPress={() => { setUseOtp(true); setPin(''); }}
                            >
                                <Text style={[styles.authOptionText, useOtp && styles.authOptionTextActive]}>OTP</Text>
                            </TouchableOpacity>
                        </View>

                        {useOtp ? (
                            <TextInput
                                style={styles.input}
                                placeholder="OTP Code"
                                placeholderTextColor="#666"
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                                maxLength={6}
                            />
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="PIN"
                                placeholderTextColor="#666"
                                value={pin}
                                onChangeText={setPin}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={6}
                            />
                        )}

                        {/* Item Selection or Manual Amount */}
                        {menuItems.length > 0 ? (
                            <>
                                <TouchableOpacity style={styles.addItemsBtn} onPress={() => setShowItemSelector(true)}>
                                    <Text style={styles.addItemsBtnText}>+ Add Items from Menu</Text>
                                </TouchableOpacity>

                                {/* Cart Display */}
                                {cart.length > 0 && (
                                    <View style={styles.cartBox}>
                                        <View style={styles.cartHeader}>
                                            <Text style={styles.cartTitle}>Order Items</Text>
                                            <TouchableOpacity onPress={clearCart}>
                                                <Text style={styles.clearCart}>Clear All</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {cart.map(item => (
                                            <View key={item.id} style={styles.cartItem}>
                                                <View style={styles.cartItemLeft}>
                                                    <Text style={styles.cartItemName}>{item.name}</Text>
                                                    <Text style={styles.cartItemPrice}>₹{parseFloat(item.price).toFixed(2)} x {item.quantity}</Text>
                                                </View>
                                                <View style={styles.cartItemRight}>
                                                    <Text style={styles.cartItemTotal}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</Text>
                                                    <View style={styles.cartQtyBtns}>
                                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                                                            <Text style={styles.qtyBtnText}>-</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                                                            <Text style={styles.qtyBtnText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={styles.cartTotal}>
                                            <Text style={styles.cartTotalLabel}>Total</Text>
                                            <Text style={styles.cartTotalValue}>₹{cartTotal.toFixed(2)}</Text>
                                        </View>
                                    </View>
                                )}

                                {cart.length === 0 && (
                                    <View style={styles.orDivider}>
                                        <View style={styles.orLine} />
                                        <Text style={styles.orText}>OR enter amount manually</Text>
                                        <View style={styles.orLine} />
                                    </View>
                                )}
                            </>
                        ) : null}

                        {cart.length === 0 && (
                            <TextInput
                                style={styles.input}
                                placeholder="Amount (₹)"
                                placeholderTextColor="#666"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                            />
                        )}

                        <TouchableOpacity
                            style={[styles.payBtn, processing && styles.payBtnDisabled]}
                            onPress={handleTransaction}
                            disabled={processing}
                        >
                            {processing ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.payBtnText}>
                                    {cart.length > 0 ? `Charge ₹${cartTotal.toFixed(2)}` : 'Process Payment'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
                        <Text style={styles.withdrawText}>Request Settlement</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* Menu Management Tab */}
            {activeTab === 'menu' && (
                <View style={styles.menuSection}>
                    <View style={styles.menuHeader}>
                        <Text style={styles.sectionTitle}>Menu Items</Text>
                        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingItem(null); setNewItemName(''); setNewItemPrice(''); setNewItemCategory(''); setShowAddItem(true); }}>
                            <Text style={styles.addBtnText}>+ Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {menuItems.length === 0 ? (
                        <View style={styles.emptyMenu}>
                            <Text style={styles.emptyText}>No menu items yet</Text>
                            <Text style={styles.emptySubtext}>Add items to enable item-based billing</Text>
                        </View>
                    ) : (
                        Object.keys(groupedMenuItems).map(category => (
                            <View key={category} style={styles.categorySection}>
                                <Text style={styles.categoryTitle}>{category}</Text>
                                {groupedMenuItems[category].map(item => (
                                    <View key={item.id} style={[styles.menuItem, !item.available && styles.menuItemUnavailable]}>
                                        <View style={styles.menuItemLeft}>
                                            <Text style={[styles.menuItemName, !item.available && styles.textStrike]}>{item.name}</Text>
                                            <Text style={styles.menuItemPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.menuItemActions}>
                                            <TouchableOpacity style={styles.menuActionBtn} onPress={() => handleToggleAvailability(item)}>
                                                <Text style={[styles.menuActionText, item.available ? styles.textGreen : styles.textRed]}>
                                                    {item.available ? 'Available' : 'Unavailable'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuActionBtn} onPress={() => openEditItem(item)}>
                                                <Text style={styles.menuActionText}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.menuActionBtn} onPress={() => handleDeleteMenuItem(item)}>
                                                <Text style={[styles.menuActionText, styles.textRed]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {transactions.length === 0 ? (
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    ) : (
                        transactions.slice(0, 20).map((tx, index) => (
                            <View key={tx.id || index} style={styles.txRow}>
                                <View style={styles.txLeft}>
                                    <Text style={styles.txStudent}>{tx.studentName || 'Student'}</Text>
                                    <Text style={styles.txTime}>
                                        {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    {tx.description && <Text style={styles.txDesc}>{tx.description}</Text>}
                                </View>
                                <Text style={styles.txAmount}>+₹{parseFloat(tx.amount || 0).toFixed(2)}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* Item Selector Modal */}
            <Modal visible={showItemSelector} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Items</Text>
                        <TouchableOpacity onPress={() => setShowItemSelector(false)}>
                            <Text style={styles.modalClose}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.itemList}>
                        {availableItems.length === 0 ? (
                            <Text style={styles.emptyText}>No items available. Add items in Menu tab.</Text>
                        ) : (
                            availableItems.map(item => {
                                const inCart = cart.find(c => c.id === item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.selectableItem, inCart && styles.selectableItemInCart]}
                                        onPress={() => addToCart(item)}
                                    >
                                        <View>
                                            <Text style={styles.selectableItemName}>{item.name}</Text>
                                            <Text style={styles.selectableItemCategory}>{item.category || 'General'}</Text>
                                        </View>
                                        <View style={styles.selectableItemRight}>
                                            <Text style={styles.selectableItemPrice}>₹{parseFloat(item.price).toFixed(2)}</Text>
                                            {inCart && <Text style={styles.inCartBadge}>x{inCart.quantity}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {cart.length > 0 && (
                        <View style={styles.modalFooter}>
                            <Text style={styles.modalFooterText}>{cart.length} items | Total: ₹{cartTotal.toFixed(2)}</Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Add/Edit Item Modal */}
            <Modal visible={showAddItem} animationType="slide" transparent>
                <View style={styles.addItemModal}>
                    <View style={styles.addItemContent}>
                        <Text style={styles.addItemTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Item Name"
                            placeholderTextColor="#666"
                            value={newItemName}
                            onChangeText={setNewItemName}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Price (₹)"
                            placeholderTextColor="#666"
                            value={newItemPrice}
                            onChangeText={setNewItemPrice}
                            keyboardType="decimal-pad"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Category (e.g., Food, Beverages)"
                            placeholderTextColor="#666"
                            value={newItemCategory}
                            onChangeText={setNewItemCategory}
                        />

                        <View style={styles.addItemBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddItem(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMenuItem} disabled={savingItem}>
                                {savingItem ? (
                                    <ActivityIndicator color="#000" size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Add'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* QR Scanner Modal */}
            <Modal visible={showScanner} animationType="slide">
                <View style={styles.scannerContainer}>
                    <View style={styles.scannerHeader}>
                        <Text style={styles.scannerTitle}>Scan Student QR</Text>
                        <TouchableOpacity onPress={() => setShowScanner(false)}>
                            <Text style={styles.scannerClose}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <CameraView
                        style={styles.camera}
                        facing="back"
                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                        onBarcodeScanned={handleBarCodeScanned}
                    />

                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerFrame} />
                    </View>

                    <Text style={styles.scannerHint}>Position QR code in frame</Text>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#0B0F1A', padding: 20, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    welcome: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    logout: { color: 'red' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    statCard: { flex: 1, backgroundColor: '#151B2B', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: '#2EF2C5' },
    todayCard: { borderColor: '#FFB800' },
    statLabel: { color: '#888', fontSize: 12, marginBottom: 5 },
    statValue: { color: '#2EF2C5', fontSize: 24, fontWeight: 'bold' },
    todayValue: { color: '#FFB800', fontSize: 24, fontWeight: 'bold' },
    todayCount: { color: '#666', fontSize: 11, marginTop: 3 },

    // Tabs
    tabRow: { flexDirection: 'row', backgroundColor: '#151B2B', borderRadius: 10, padding: 4, marginBottom: 15 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: '#2EF2C5' },
    tabText: { color: '#888', fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#000' },

    transactionBox: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 15 },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
    sectionSubtitle: { color: '#666', fontSize: 12 },

    scanBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
    scanBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    scannedInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0F1A', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#2EF2C5' },
    scannedLabel: { color: '#888', fontSize: 12, marginRight: 8 },
    scannedName: { color: '#2EF2C5', fontSize: 14, fontWeight: 'bold' },

    authToggle: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#0B0F1A', borderRadius: 8, padding: 4 },
    authOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    authOptionActive: { backgroundColor: '#2EF2C5' },
    authOptionText: { color: '#888', fontSize: 13, fontWeight: '600' },
    authOptionTextActive: { color: '#000' },

    input: { backgroundColor: '#0B0F1A', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, color: '#fff', fontSize: 16, marginBottom: 12 },

    addItemsBtn: { backgroundColor: '#0B0F1A', borderWidth: 1, borderColor: '#2EF2C5', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 12 },
    addItemsBtnText: { color: '#2EF2C5', fontSize: 14, fontWeight: '600' },

    // Cart styles
    cartBox: { backgroundColor: '#0B0F1A', borderRadius: 10, padding: 15, marginBottom: 12 },
    cartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    cartTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    clearCart: { color: '#FF4444', fontSize: 12 },
    cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222' },
    cartItemLeft: { flex: 1 },
    cartItemName: { color: '#fff', fontSize: 14 },
    cartItemPrice: { color: '#888', fontSize: 12 },
    cartItemRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cartItemTotal: { color: '#2EF2C5', fontWeight: 'bold' },
    cartQtyBtns: { flexDirection: 'row', gap: 5 },
    qtyBtn: { backgroundColor: '#333', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    cartTotal: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
    cartTotalLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    cartTotalValue: { color: '#2EF2C5', fontWeight: 'bold', fontSize: 18 },

    orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: '#333' },
    orText: { color: '#666', marginHorizontal: 10, fontSize: 12 },

    payBtn: { backgroundColor: '#2EF2C5', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    payBtnDisabled: { opacity: 0.6 },
    payBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

    withdrawBtn: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
    withdrawText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

    // Menu management
    menuSection: { backgroundColor: '#151B2B', borderRadius: 15, padding: 20, marginBottom: 20 },
    menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    addBtn: { backgroundColor: '#2EF2C5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
    emptyMenu: { alignItems: 'center', paddingVertical: 30 },
    emptySubtext: { color: '#666', fontSize: 12, marginTop: 5 },
    categorySection: { marginBottom: 15 },
    categoryTitle: { color: '#2EF2C5', fontSize: 14, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B0F1A', padding: 12, borderRadius: 8, marginBottom: 8 },
    menuItemUnavailable: { opacity: 0.5 },
    menuItemLeft: {},
    menuItemName: { color: '#fff', fontSize: 14, fontWeight: '600' },
    menuItemPrice: { color: '#888', fontSize: 12, marginTop: 2 },
    menuItemActions: { flexDirection: 'row', gap: 10 },
    menuActionBtn: { padding: 5 },
    menuActionText: { color: '#888', fontSize: 12 },
    textGreen: { color: '#2EF2C5' },
    textRed: { color: '#FF4444' },
    textStrike: { textDecorationLine: 'line-through' },

    // History
    historySection: { backgroundColor: '#151B2B', padding: 20, borderRadius: 15, marginBottom: 20 },
    emptyText: { color: '#666', textAlign: 'center', paddingVertical: 20 },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222' },
    txLeft: { flex: 1 },
    txStudent: { color: '#fff', fontSize: 14, fontWeight: '600' },
    txTime: { color: '#666', fontSize: 11, marginTop: 2 },
    txDesc: { color: '#888', fontSize: 12, marginTop: 2, fontStyle: 'italic' },
    txAmount: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold' },

    // Item selector modal
    modalContainer: { flex: 1, backgroundColor: '#0B0F1A' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    modalClose: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold' },
    itemList: { flex: 1, padding: 20 },
    selectableItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#151B2B', padding: 15, borderRadius: 10, marginBottom: 10 },
    selectableItemInCart: { borderWidth: 1, borderColor: '#2EF2C5' },
    selectableItemName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    selectableItemCategory: { color: '#666', fontSize: 12, marginTop: 2 },
    selectableItemRight: { alignItems: 'flex-end' },
    selectableItemPrice: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold' },
    inCartBadge: { color: '#FFB800', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    modalFooter: { padding: 20, backgroundColor: '#151B2B', borderTopWidth: 1, borderTopColor: '#333' },
    modalFooterText: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },

    // Add item modal
    addItemModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
    addItemContent: { backgroundColor: '#151B2B', padding: 25, borderRadius: 15, width: '90%' },
    addItemTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    addItemBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
    cancelBtn: { flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
    cancelBtnText: { color: '#fff', fontWeight: 'bold' },
    saveBtn: { flex: 1, backgroundColor: '#2EF2C5', padding: 15, borderRadius: 10, alignItems: 'center' },
    saveBtnText: { color: '#000', fontWeight: 'bold' },

    // Scanner
    scannerContainer: { flex: 1, backgroundColor: '#000' },
    scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#0B0F1A' },
    scannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    scannerClose: { color: '#2EF2C5', fontSize: 16, fontWeight: 'bold' },
    camera: { flex: 1 },
    scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    scannerFrame: { width: 250, height: 250, borderWidth: 3, borderColor: '#2EF2C5', borderRadius: 20, backgroundColor: 'transparent' },
    scannerHint: { color: '#fff', textAlign: 'center', padding: 20, backgroundColor: '#0B0F1A', fontSize: 14 }
});
