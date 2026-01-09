import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import api from '../api/api';
import { parseBalance, formatCurrency, safeNumber } from '../utils/numberUtils';

export default function DiagnosticScreen() {
    const [logs, setLogs] = useState([]);
    const [testResults, setTestResults] = useState([]);

    const addLog = (message) => {
        console.log('[DIAGNOSTIC]', message);
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const runTests = async () => {
        setTestResults([]);
        setLogs([]);

        // Test 1: Number utilities
        addLog('Testing number utilities...');
        try {
            const test1 = safeNumber(500);
            const test2 = formatCurrency(500);
            const test3 = safeNumber("500");
            const test4 = formatCurrency(null);

            setTestResults(prev => [...prev,
            `✅ safeNumber(500) = ${test1}`,
            `✅ formatCurrency(500) = ${test2}`,
            `✅ safeNumber("500") = ${test3}`,
            `✅ formatCurrency(null) = ${test4}`
            ]);
            addLog('Number utilities: PASSED');
        } catch (error) {
            setTestResults(prev => [...prev, `❌ Number utilities failed: ${error.message}`]);
            addLog(`Number utilities: FAILED - ${error.message}`);
        }

        // Test 2: API Connection
        addLog('Testing API connection...');
        try {
            const response = await api.get('/wallet/balance');
            addLog(`API Response: ${JSON.stringify(response.data)}`);

            const balance = parseBalance(response);
            setTestResults(prev => [...prev,
                `✅ API connected successfully`,
            `✅ Balance parsed: ${balance}`,
            `✅ Formatted: ${formatCurrency(balance)}`
            ]);
            addLog('API connection: PASSED');
        } catch (error) {
            setTestResults(prev => [...prev,
            `❌ API failed: ${error.message}`,
            `URL: ${error.config?.url || 'unknown'}`,
            `Status: ${error.response?.status || 'no response'}`
            ]);
            addLog(`API connection: FAILED - ${error.message}`);
        }
    };

    useEffect(() => {
        runTests();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>🔍 Diagnostic Screen</Text>

            <TouchableOpacity style={styles.button} onPress={runTests}>
                <Text style={styles.buttonText}>🔄 Run Tests Again</Text>
            </TouchableOpacity>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Test Results:</Text>
                {testResults.map((result, index) => (
                    <Text key={index} style={styles.result}>{result}</Text>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Logs:</Text>
                {logs.map((log, index) => (
                    <Text key={index} style={styles.log}>{log}</Text>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A',
        padding: 20,
        paddingTop: 50,
    },
    title: {
        color: '#2EF2C5',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#2EF2C5',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#151B2B',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: '#2EF2C5',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    result: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 5,
    },
    log: {
        color: '#888',
        fontSize: 12,
        marginBottom: 3,
    },
});
