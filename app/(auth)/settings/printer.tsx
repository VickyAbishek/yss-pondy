import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import {
    connectToPrinter,
    disconnectPrinter,
    getCurrentPrinter,
    isBluetoothAvailable,
    isPrinterConnected,
    print,
    PrinterDevice,
    scanForPrinters
} from '../../../lib/bluetooth-printer';
import { EscPosEncoder } from '../../../lib/escpos';
import { getSavedPrinter, removeSavedPrinter, savePrinter } from '../../../lib/printer-storage';

export default function PrinterSettingsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [testPrinting, setTestPrinting] = useState(false);
    const [connected, setConnected] = useState(false);
    const [currentPrinter, setCurrentPrinter] = useState<PrinterDevice | null>(null);
    const [savedPrinterInfo, setSavedPrinterInfo] = useState<{ name: string; savedAt: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Check connection status and load saved printer on mount
    useEffect(() => {
        checkConnectionStatus();
        loadSavedPrinter();
    }, []);

    const checkConnectionStatus = () => {
        const isConnected = isPrinterConnected();
        setConnected(isConnected);
        if (isConnected) {
            setCurrentPrinter(getCurrentPrinter());
        }
    };

    const loadSavedPrinter = async () => {
        const saved = await getSavedPrinter();
        if (saved) {
            setSavedPrinterInfo({ name: saved.name, savedAt: saved.savedAt });
        }
    };

    const handleScanAndConnect = async () => {
        if (!isBluetoothAvailable()) {
            setError('Web Bluetooth is not available. Please use Chrome on Android, Windows, or macOS.');
            return;
        }

        setScanning(true);
        setError(null);

        try {
            // Scan and let user select a printer
            const device = await scanForPrinters();
            console.log('Selected device:', device.name, device.id);

            // Connect to the selected device
            setLoading(true);
            setScanning(false);
            await connectToPrinter(device);

            // Save the printer for future reference
            await savePrinter({ id: device.id, name: device.name || 'Unknown Printer' });

            setConnected(true);
            setCurrentPrinter({ id: device.id, name: device.name || 'Unknown Printer' });
            setSavedPrinterInfo({
                name: device.name || 'Unknown Printer',
                savedAt: new Date().toISOString()
            });

        } catch (err: any) {
            console.error('Error connecting to printer:', err);
            if (err.message?.includes('User cancelled')) {
                // User cancelled the dialog, not an error
            } else {
                setError(err.message || 'Failed to connect to printer');
            }
        } finally {
            setScanning(false);
            setLoading(false);
        }
    };

    const handleDisconnect = () => {
        disconnectPrinter();
        setConnected(false);
        setCurrentPrinter(null);
    };

    const handleForgetPrinter = async () => {
        handleDisconnect();
        await removeSavedPrinter();
        setSavedPrinterInfo(null);
    };

    const handleTestPrint = async () => {
        if (!connected) {
            setError('Please connect to a printer first');
            return;
        }

        setTestPrinting(true);
        setError(null);

        try {
            const encoder = new EscPosEncoder();
            const data = encoder
                .init()
                .align(0x01) // Center
                .bold(true)
                .line('YSS Pondy')
                .bold(false)
                .line('Test Print')
                .separator('=')
                .align(0x00) // Left
                .line('')
                .line('Printer is working!')
                .line(new Date().toLocaleString())
                .separator('-')
                .align(0x01)
                .line('Jai Guru')
                .feed(3)
                .cut()
                .encode();

            await print(data);

            if (Platform.OS === 'web') {
                window.alert('Test print sent successfully!');
            } else {
                Alert.alert('Success', 'Test print sent successfully!');
            }
        } catch (err: any) {
            console.error('Error printing:', err);
            setError(err.message || 'Failed to print');
        } finally {
            setTestPrinting(false);
        }
    };

    const bluetoothSupported = Platform.OS === 'web' ? isBluetoothAvailable() : false;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Printer Settings</Text>
                <View style={{ width: 34 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Bluetooth Support Notice */}
                {Platform.OS === 'web' && !bluetoothSupported && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning-outline" size={24} color="#f57c00" />
                        <Text style={styles.warningText}>
                            Web Bluetooth is not available. Please use Chrome on Android, Windows, or macOS.
                        </Text>
                    </View>
                )}

                {/* Current Connection Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Connection Status</Text>
                    <View style={styles.statusCard}>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusIndicator, { backgroundColor: connected ? '#4CAF50' : '#9e9e9e' }]} />
                            <Text style={styles.statusText}>
                                {connected ? 'Connected' : 'Not Connected'}
                            </Text>
                        </View>
                        {currentPrinter && (
                            <Text style={styles.printerName}>{currentPrinter.name}</Text>
                        )}
                        {!connected && savedPrinterInfo && (
                            <Text style={styles.savedPrinterText}>
                                Last used: {savedPrinterInfo.name}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Error Display */}
                {error && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle-outline" size={20} color="#d32f2f" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={() => setError(null)}>
                            <Ionicons name="close" size={20} color="#d32f2f" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Connect Button */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Printer Connection</Text>

                    {!connected ? (
                        <TouchableOpacity
                            style={[styles.primaryButton, (scanning || loading) && styles.disabledButton]}
                            onPress={handleScanAndConnect}
                            disabled={scanning || loading}
                        >
                            {scanning || loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="bluetooth" size={20} color="white" />
                                    <Text style={styles.primaryButtonText}>Scan for Printers</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.disconnectButton}
                            onPress={handleDisconnect}
                        >
                            <Ionicons name="bluetooth-outline" size={20} color={Colors.yss.orange} />
                            <Text style={styles.disconnectButtonText}>Disconnect</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Test Print Button */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Print</Text>
                    <TouchableOpacity
                        style={[styles.testButton, (!connected || testPrinting) && styles.disabledButton]}
                        onPress={handleTestPrint}
                        disabled={!connected || testPrinting}
                    >
                        {testPrinting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="print" size={20} color="white" />
                                <Text style={styles.testButtonText}>Print Test Page</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Forget Printer */}
                {savedPrinterInfo && (
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.forgetButton}
                            onPress={handleForgetPrinter}
                        >
                            <Ionicons name="trash-outline" size={18} color="#d32f2f" />
                            <Text style={styles.forgetButtonText}>Forget Saved Printer</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Info Box */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.yss.orange} />
                    <Text style={styles.infoText}>
                        This printer feature works with Bluetooth thermal receipt printers (58mm width).
                        Compatible with Chrome browser on Android, Windows, and macOS.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        backgroundColor: Colors.yss.white,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusCard: {
        backgroundColor: Colors.yss.white,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    printerName: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    savedPrinterText: {
        fontSize: 13,
        color: '#999',
        marginTop: 8,
        fontStyle: 'italic',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.yss.orange,
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    primaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    disconnectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        gap: 10,
        borderWidth: 2,
        borderColor: Colors.yss.orange,
    },
    disconnectButtonText: {
        color: Colors.yss.orange,
        fontSize: 16,
        fontWeight: '600',
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    forgetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
    },
    forgetButtonText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '500',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: '#fff3e0',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'flex-start',
        gap: 10,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: '#e65100',
        lineHeight: 20,
    },
    errorBox: {
        flexDirection: 'row',
        backgroundColor: '#ffebee',
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
        alignItems: 'center',
        gap: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        color: '#d32f2f',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(232, 93, 4, 0.1)',
        padding: 15,
        borderRadius: 12,
        alignItems: 'flex-start',
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: Colors.yss.text,
        lineHeight: 18,
    },
});
