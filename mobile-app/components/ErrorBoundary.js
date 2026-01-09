import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong!</Text>
                    <ScrollView style={styles.errorContainer}>
                        <Text style={styles.errorText}>Error: {this.state.error?.toString()}</Text>
                        <Text style={styles.stackText}>{this.state.errorInfo?.componentStack}</Text>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A',
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        color: '#FF4444',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    errorContainer: {
        backgroundColor: '#151B2B',
        padding: 15,
        borderRadius: 10,
    },
    errorText: {
        color: '#FF4444',
        fontSize: 14,
        marginBottom: 10,
    },
    stackText: {
        color: '#888',
        fontSize: 12,
    },
});

export default ErrorBoundary;
