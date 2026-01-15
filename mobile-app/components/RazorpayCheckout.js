import React, { useState, useRef } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

const RazorpayCheckout = ({ visible, onClose, orderData, onSuccess, onFailure }) => {
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef(null);

    if (!orderData) return null;

    const { orderId, amount, keyId, userName, userEmail, userPhone } = orderData;

    // HTML page with Razorpay checkout
    const razorpayHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
            <style>
                body {
                    background: #0B0F1A;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                }
                .container {
                    text-align: center;
                    color: #fff;
                    padding: 20px;
                }
                .amount {
                    font-size: 36px;
                    color: #2EF2C5;
                    font-weight: bold;
                    margin: 20px 0;
                }
                .loading {
                    color: #888;
                }
                .btn {
                    background: #2EF2C5;
                    color: #000;
                    border: none;
                    padding: 15px 40px;
                    font-size: 16px;
                    font-weight: bold;
                    border-radius: 10px;
                    cursor: pointer;
                    margin-top: 20px;
                }
                .btn:hover {
                    background: #26d4ad;
                }
                .cancel {
                    background: #333;
                    color: #fff;
                    margin-top: 15px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Add Money to Wallet</h2>
                <div class="amount">₹${amount}</div>
                <p class="loading" id="status">Initializing payment...</p>
                <button class="btn" id="payBtn" style="display:none" onclick="openRazorpay()">Pay Now</button>
                <button class="btn cancel" onclick="cancelPayment()">Cancel</button>
            </div>

            <script>
                var options = {
                    key: '${keyId}',
                    amount: ${amount * 100},
                    currency: 'INR',
                    name: 'Guardian Wallet',
                    description: 'Wallet Recharge',
                    order_id: '${orderId}',
                    prefill: {
                        name: '${userName || ''}',
                        email: '${userEmail || ''}',
                        contact: '${userPhone || ''}'
                    },
                    theme: {
                        color: '#2EF2C5'
                    },
                    handler: function(response) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'success',
                            data: response
                        }));
                    },
                    modal: {
                        ondismiss: function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'dismissed'
                            }));
                        }
                    }
                };

                var rzp = new Razorpay(options);

                rzp.on('payment.failed', function(response) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'failure',
                        error: response.error
                    }));
                });

                function openRazorpay() {
                    rzp.open();
                }

                function cancelPayment() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'cancelled'
                    }));
                }

                // Auto-open after load
                document.getElementById('status').textContent = 'Ready to pay';
                document.getElementById('payBtn').style.display = 'inline-block';

                // Auto-open Razorpay
                setTimeout(function() {
                    openRazorpay();
                }, 500);
            </script>
        </body>
        </html>
    `;

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'success') {
                onSuccess(data.data);
            } else if (data.type === 'failure') {
                onFailure(data.error);
            } else if (data.type === 'cancelled' || data.type === 'dismissed') {
                onClose();
            }
        } catch (error) {
            console.error('WebView message error:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Payment</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeBtn}>Close</Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2EF2C5" />
                        <Text style={styles.loadingText}>Loading payment gateway...</Text>
                    </View>
                )}

                <WebView
                    ref={webViewRef}
                    source={{ html: razorpayHTML }}
                    style={[styles.webview, loading && styles.hidden]}
                    onLoadEnd={() => setLoading(false)}
                    onMessage={handleMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0F1A'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#151B2B',
        borderBottomWidth: 1,
        borderBottomColor: '#333'
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    },
    closeBtn: {
        color: '#FF4444',
        fontSize: 16,
        fontWeight: 'bold'
    },
    webview: {
        flex: 1,
        backgroundColor: '#0B0F1A'
    },
    hidden: {
        opacity: 0
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0B0F1A',
        zIndex: 10
    },
    loadingText: {
        color: '#888',
        marginTop: 15
    }
});

export default RazorpayCheckout;
