import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>✅ App is Working!</Text>
            <Text style={styles.subtext}>If you see this, the app loaded successfully.</Text>
            <Text style={styles.info}>Now we can add features back one by one.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        color: '#2EF2C5',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subtext: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    info: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
    },
});
