import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();

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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Guardian<Text style={styles.highlight}>Wallet</Text></Text>

            <View style={styles.form}>
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
                    Use demo accounts:
                    {'\n'}guardian@test.com
                    {'\n'}student@test.com
                </Text>
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
        marginBottom: 40,
    },
    highlight: {
        color: '#2EF2C5',
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
