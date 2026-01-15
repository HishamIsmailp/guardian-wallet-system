import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const [isStudentMode, setIsStudentMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [studentId, setStudentId] = useState('');
    const [pin, setPin] = useState('');
    const { login, setUser } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const result = await login(email, password);
        if (!result.success) {
            Alert.alert('Login Failed', result.message);
        }
    };

    const handleStudentLogin = async () => {
        if (!studentId || !pin) {
            Alert.alert('Error', 'Please enter Student ID and PIN');
            return;
        }

        try {
            const res = await api.post('/student/login', {
                studentId: studentId.trim().toUpperCase(),
                pin: pin.trim()
            });

            // Store token and user data
            await AsyncStorage.setItem('token', res.data.accessToken);
            await AsyncStorage.setItem('user', JSON.stringify({
                id: res.data.student.id,
                name: res.data.student.name,
                studentId: res.data.student.studentId,
                isStudent: true,
                role: { name: 'STUDENT' }
            }));

            // Update auth context
            setUser({
                id: res.data.student.id,
                name: res.data.student.name,
                studentId: res.data.student.studentId,
                isStudent: true,
                role: { name: 'STUDENT' }
            });
        } catch (error) {
            Alert.alert('Login Failed', error.response?.data?.error || 'Invalid Student ID or PIN');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Guardian<Text style={styles.highlight}>Wallet</Text></Text>

            {/* Login mode toggle */}
            <View style={styles.modeToggle}>
                <TouchableOpacity
                    style={[styles.modeOption, !isStudentMode && styles.modeOptionActive]}
                    onPress={() => setIsStudentMode(false)}
                >
                    <Text style={[styles.modeOptionText, !isStudentMode && styles.modeOptionTextActive]}>
                        Guardian / Vendor
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeOption, isStudentMode && styles.modeOptionActive]}
                    onPress={() => setIsStudentMode(true)}
                >
                    <Text style={[styles.modeOptionText, isStudentMode && styles.modeOptionTextActive]}>
                        Student
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                {isStudentMode ? (
                    // Student login form
                    <>
                        <Text style={styles.label}>Student ID</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. STU001"
                            placeholderTextColor="#666"
                            value={studentId}
                            onChangeText={setStudentId}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>PIN</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="4-6 digit PIN"
                            placeholderTextColor="#666"
                            secureTextEntry
                            keyboardType="numeric"
                            maxLength={6}
                            value={pin}
                            onChangeText={setPin}
                        />

                        <TouchableOpacity style={styles.button} onPress={handleStudentLogin}>
                            <Text style={styles.buttonText}>Login as Student</Text>
                        </TouchableOpacity>

                        <Text style={styles.hint}>
                            Login to set up biometric payments.{'\n'}
                            Use fingerprint instead of PIN at vendors.
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

                        <TouchableOpacity style={styles.button} onPress={handleLogin}>
                            <Text style={styles.buttonText}>Sign In</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A',
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
