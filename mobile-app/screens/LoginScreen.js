import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';


export default function LoginScreen() {
    const [mode, setMode] = useState('login'); // 'login', 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Registration fields
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registerRole, setRegisterRole] = useState('GUARDIAN'); // 'GUARDIAN' or 'VENDOR'
    const [storeName, setStoreName] = useState('');

    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const result = await login(email, password);
            if (!result.success) {
                Alert.alert('Login Failed', result.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (registerRole === 'VENDOR' && !storeName) {
            Alert.alert('Error', 'Please enter your store/business name');
            return;
        }

        try {
            const payload = {
                name,
                email,
                password,
                roleName: registerRole,
            };

            if (registerRole === 'VENDOR') {
                payload.storeName = storeName;
            }

            setLoading(true);
            const res = await api.post('/auth/register', payload);

            Alert.alert(
                'Registration Successful',
                registerRole === 'VENDOR'
                    ? 'Your vendor account is pending approval. You can login once an admin approves your account.'
                    : 'Account created successfully! You can now login.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setMode('login');
                            setName('');
                            setPassword('');
                            setConfirmPassword('');
                            setStoreName('');
                        }
                    }
                ]
            );
        } catch (error) {
            Alert.alert('Registration Failed', error.response?.data?.error || 'Failed to create account');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Guardian<Text style={styles.highlight}>Wallet</Text></Text>

            {/* Mode toggle */}
            <View style={styles.modeToggle}>
                <TouchableOpacity
                    style={[styles.modeOption, mode === 'login' && styles.modeOptionActive]}
                    onPress={() => setMode('login')}
                >
                    <Text style={[styles.modeOptionText, mode === 'login' && styles.modeOptionTextActive]}>
                        Login
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeOption, mode === 'register' && styles.modeOptionActive]}
                    onPress={() => setMode('register')}
                >
                    <Text style={[styles.modeOptionText, mode === 'register' && styles.modeOptionTextActive]}>
                        Register
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                {mode === 'register' ? (
                    // Registration form
                    <>
                        {/* Role selection */}
                        <Text style={styles.label}>I am a</Text>
                        <View style={styles.roleToggle}>
                            <TouchableOpacity
                                style={[styles.roleOption, registerRole === 'GUARDIAN' && styles.roleOptionActive]}
                                onPress={() => setRegisterRole('GUARDIAN')}
                            >
                                <Text style={[styles.roleOptionText, registerRole === 'GUARDIAN' && styles.roleOptionTextActive]}>
                                    Guardian / Parent
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleOption, registerRole === 'VENDOR' && styles.roleOptionActive]}
                                onPress={() => setRegisterRole('VENDOR')}
                            >
                                <Text style={[styles.roleOptionText, registerRole === 'VENDOR' && styles.roleOptionTextActive]}>
                                    Vendor
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        {registerRole === 'VENDOR' && (
                            <>
                                <Text style={styles.label}>Store / Business Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="My Cafeteria"
                                    placeholderTextColor="#666"
                                    value={storeName}
                                    onChangeText={setStoreName}
                                />
                            </>
                        )}

                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="user@email.com"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min 6 characters"
                            placeholderTextColor="#666"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Re-enter password"
                            placeholderTextColor="#666"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create Account</Text>}
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            {registerRole === 'VENDOR'
                                ? 'Vendor accounts require admin approval before you can login.'
                                : 'Guardian accounts can manage student wallets and spending.'}
                        </Text>
                    </>
                ) : (
                    // Guardian/Vendor login form
                    <>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="user@college.edu"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#666"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Sign In</Text>}
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            Demo accounts:{'\n'}
                            Guardian: guardian@test.com{'\n'}
                            Vendor: vendor@test.com{'\n'}
                            (Password: password)
                        </Text>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A',
    },
    contentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 30,
    },
    highlight: {
        color: '#2EF2C5',
    },
    modeToggle: {
        flexDirection: 'row',
        marginBottom: 30,
        backgroundColor: '#151B2B',
        borderRadius: 12,
        padding: 4,
    },
    modeOption: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    modeOptionActive: {
        backgroundColor: '#2EF2C5',
    },
    modeOptionText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '600',
    },
    modeOptionTextActive: {
        color: '#000',
    },
    roleToggle: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#1a2235',
        borderRadius: 10,
        padding: 4,
    },
    roleOption: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    roleOptionActive: {
        backgroundColor: '#3b82f6',
    },
    roleOptionText: {
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
    },
    roleOptionTextActive: {
        color: '#fff',
    },
    form: {
        alignSelf: 'stretch',
    },
    label: {
        color: '#ccc',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#151B2B',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        padding: 15,
        color: '#fff',
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#2EF2C5',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    hint: {
        color: '#666',
        marginTop: 30,
        textAlign: 'center',
        lineHeight: 22,
    }
});
