import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';

export default function AddBookScreen() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        isbn: '',
        title: '',
        author: '',
        price: '',
        stock: '',
        language: '',
        thumbnail_url: '',
    });

    const [loadingBook, setLoadingBook] = useState(false);

    // Camera State
    const [scanning, setScanning] = useState(false);
    const [torch, setTorch] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const fetchBookDetails = async (isbn: string) => {
        if (!isbn) return;
        setLoadingBook(true);
        try {
            // 1. First try Google Books API
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            const data = await response.json();
            console.log('Google Books API:', `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

            if (data.totalItems > 0) {
                const book = data.items[0].volumeInfo;
                const thumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
                console.log('Book found in Google Books:', book.title);

                setForm(prev => ({
                    ...prev,
                    isbn,
                    title: book.title || '',
                    author: book.authors ? book.authors.join(', ') : '',
                    language: book.language || 'en',
                    thumbnail_url: thumbnail,
                }));
            } else {
                // 2. Fallback: Check existing inventory
                const { data: existingBook, error } = await supabase
                    .from('books')
                    .select('*')
                    .eq('isbn', isbn)
                    .limit(1)
                    .single();

                if (existingBook && !error) {
                    console.log('Book found in inventory:', existingBook.title);
                    setForm(prev => ({
                        ...prev,
                        isbn,
                        title: existingBook.title || '',
                        author: existingBook.author || '',
                        language: existingBook.language || 'en',
                        thumbnail_url: existingBook.thumbnail_url || '',
                        // Leave price and stock empty for user to enter
                        price: '',
                        stock: '',
                    }));
                } else {
                    // Not found anywhere
                    setForm(prev => ({ ...prev, isbn }));
                }
            }
        } catch (error) {
            window.alert('Failed to fetch book details. Please enter manually.');
            console.error(error);
            setForm(prev => ({ ...prev, isbn }));
        } finally {
            setLoadingBook(false);
        }
    };

    // Web Scanner Ref
    const scannerRef = React.useRef<any>(null);

    const handleScan = async () => {
        console.log('Scanner button clicked');

        if (Platform.OS !== 'web') {
            if (!permission?.granted) {
                console.log('Requesting permission...');
                const { granted } = await requestPermission();
                if (!granted) {
                    Alert.alert('Permission needed', 'Camera permission is required to scan QR codes.');
                    return;
                }
            }
        }
        setScanning(true);
    };

    const onBarcodeScanned = ({ data }: { data: string }) => {
        console.log('Barcode scanned:', data);
        setScanning(false);
        setTorch(false);
        // Stop web scanner if running
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
            scannerRef.current = null;
        }

        if (data !== form.isbn) {
            setForm(prev => ({ ...prev, isbn: data }));
            fetchBookDetails(data);
        }
    };

    const handleSave = async () => {
        console.log('Save Pressed. Form:', form);
        // Validate
        if (!form.price) {
            console.log('Validation Failed: No Price');
            Alert.alert('Missing Fields', 'Please fill in Price.');
            return;
        }
        // Stock defaults to 1 if empty, so no check needed here unless you want to forbid "0" explicitly

        setSaving(true);
        console.log('Attempting to save book:', form);

        try {
            const price = parseFloat(form.price) || 0;
            // Default to 1 if empty, or parse the value
            const stockToAdd = form.stock ? (parseInt(form.stock) || 0) : 1;

            console.log(`Checking duplicates for: Title="${form.title}", Price=${price}`);

            // 1. Check for existing book with same Title & Price
            const { data: existingBooks, error: searchError } = await supabase
                .from('books')
                .select('*')
                .eq('title', form.title)
                .eq('price', price)
                .limit(1);

            if (searchError) throw searchError;

            if (existingBooks && existingBooks.length > 0) {
                // UPDATE existing stock
                const existingBook = existingBooks[0];
                const newStock = existingBook.stock + stockToAdd;

                console.log(`Merging with existing book ID: ${existingBook.id}. Old Stock: ${existingBook.stock}, New Stock: ${newStock}`);

                const { error: updateError } = await supabase
                    .from('books')
                    .update({ stock: newStock })
                    .eq('id', existingBook.id);

                if (updateError) throw updateError;

                Alert.alert('Stock Updated', `Merged with existing entry. New Stock: ${newStock}`);
            } else {
                // INSERT new book
                const payload = {
                    isbn: form.isbn,
                    title: form.title,
                    author: form.author,
                    price: price,
                    stock: stockToAdd,
                    language: form.language,
                    type: 'Paperback',
                    thumbnail_url: form.thumbnail_url || null,
                };

                console.log('Payload:', payload);

                const { data, error } = await supabase
                    .from('books')
                    .insert(payload)
                    .select();

                if (error) throw error;
                Alert.alert('Success', 'Book added successfully!');
            }

            router.back();
        } catch (error: any) {
            console.error('Save Failure:', error);
            Alert.alert('Error Saving', error.message || 'Unknown error occurred');
        } finally {
            setSaving(false);
        }
    };

    // Web Scanner Effect
    React.useEffect(() => {
        if (scanning && Platform.OS === 'web') {
            // Dynamic import to avoid native bundler issues
            const { Html5Qrcode } = require('html5-qrcode');

            const startScanner = async () => {
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;

                try {
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 350 },
                            videoConstraints: {
                                facingMode: "environment",
                                width: { min: 640, ideal: 1920 },
                                height: { min: 480, ideal: 1080 },
                            }
                        },
                        (decodedText: string) => {
                            onBarcodeScanned({ data: decodedText });
                        },
                        (errorMessage: string) => {
                            // ignore
                        }
                    );
                } catch (err) {
                    console.error("Error starting web scanner", err);
                    setScanning(false);
                    Alert.alert("Scanner Error", "Could not start camera. Please ensure permissions are granted.");
                }
            };

            // Small delay to ensure DOM is ready
            setTimeout(startScanner, 100);

            return () => {
                if (scannerRef.current) {
                    scannerRef.current.stop().catch((err: any) => console.log('Stop failed', err));
                }
            };
        }
    }, [scanning]);

    if (scanning) {
        return (
            <View style={styles.cameraContainer}>
                {Platform.OS === 'web' ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View nativeID="reader" style={{ width: 500, maxWidth: '100%', height: 750, overflow: 'hidden' }} />
                        <Text style={{ color: 'white', marginTop: 20 }}>Camera Active (High Res)</Text>
                    </View>
                ) : (
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        enableTorch={torch}
                        onBarcodeScanned={onBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "ean13"],
                        }}
                    />
                )}

                <TouchableOpacity style={styles.closeCamera} onPress={() => {
                    setScanning(false);
                    setTorch(false);
                    if (scannerRef.current) {
                        scannerRef.current.stop().catch(console.error);
                    }
                }}>
                    <Ionicons name="close-circle" size={50} color="white" />
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                    <>
                        <TouchableOpacity
                            style={[styles.closeCamera, { top: undefined, bottom: 40, right: 20 }]}
                            onPress={() => setTorch(!torch)}
                        >
                            <Ionicons name={torch ? "flash" : "flash-off"} size={30} color="white" />
                        </TouchableOpacity>

                        <View style={styles.scanOverlay}>
                            <Text style={styles.scanText}>Align code within frame</Text>
                            <View style={styles.scanFrame} />
                        </View>
                    </>
                )}
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add New Book</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
                    <Text style={[styles.saveText, { opacity: saving ? 0.5 : 1 }]}>
                        {saving ? 'Saving...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>ISBN / Barcode</Text>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={form.isbn}
                            onChangeText={t => setForm(prev => ({ ...prev, isbn: t }))}
                            placeholder="Scan or type ISBN"
                            keyboardType="numeric"
                        />
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: Colors.yss.secondaryOrange }]}
                            onPress={() => fetchBookDetails(form.isbn)}
                            disabled={loadingBook}
                        >
                            <Ionicons name="cloud-download-outline" size={24} color={Colors.yss.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.scanButton} onPress={handleScan}>
                            <Ionicons name="qr-code-outline" size={24} color={Colors.yss.white} />
                        </TouchableOpacity>
                    </View>
                    {loadingBook && <Text style={{ marginLeft: 5, marginTop: 5, color: Colors.yss.icon }}>Fetching details...</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Book Title</Text>
                    <TextInput
                        style={styles.input}
                        value={form.title}
                        onChangeText={t => setForm(prev => ({ ...prev, title: t }))}
                        placeholder="He's a Jolly Good Fellow..."
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Author</Text>
                        <TextInput
                            style={styles.input}
                            value={form.author}
                            onChangeText={t => setForm(prev => ({ ...prev, author: t }))}
                            placeholder="Author Name"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 0.5 }]}>
                        <Text style={styles.label}>Language</Text>
                        <TextInput
                            style={styles.input}
                            value={form.language}
                            onChangeText={t => setForm(prev => ({ ...prev, language: t }))}
                            placeholder="en"
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Price (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.price}
                            onChangeText={t => setForm(prev => ({ ...prev, price: t }))}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Initial Stock</Text>
                        <TextInput
                            style={styles.input}
                            value={form.stock}
                            onChangeText={t => setForm(prev => ({ ...prev, stock: t }))}
                            placeholder="1"
                            keyboardType="numeric"
                        />
                    </View>
                </View>

            </ScrollView>

            {/* Loading Overlay */}
            {loadingBook && (
                <View style={[styles.loadingOverlay, StyleSheet.absoluteFill]}>
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={Colors.yss.orange} />
                        <Text style={styles.loadingText}>Fetching Book Details...</Text>
                    </View>
                </View>
            )}
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
        zIndex: 1,
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
    saveButton: {
        padding: 10,
    },
    saveText: {
        color: Colors.yss.orange,
        fontWeight: 'bold',
        fontSize: 16,
    },
    content: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: Colors.yss.text,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Colors.yss.white,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: Colors.yss.text,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        minWidth: 0, // Fix for flex child overflow on web
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 10,
    },
    scanButton: {
        backgroundColor: Colors.yss.orange,
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Ensure clickable
        cursor: 'pointer', // Web helper
    },
    cameraContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeCamera: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
    },
    scanOverlay: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    scanText: {
        color: 'white',
        marginBottom: 20,
        fontSize: 16,
        fontWeight: '600',
    },
    scanFrame: {
        width: 200,
        height: 200,
        borderWidth: 2,
        borderColor: Colors.yss.orange,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    loadingOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingBox: {
        backgroundColor: 'white',
        padding: 25,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: Colors.yss.text,
        fontWeight: '600',
    },
});
