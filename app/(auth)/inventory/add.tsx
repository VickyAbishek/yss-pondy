import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
    const [permission, requestPermission] = useCameraPermissions();

    const fetchBookDetails = async (isbn: string) => {
        if (!isbn) return;
        setLoadingBook(true);
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            const data = await response.json();
            console.log('Rewqq: ', `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            console.log('Book Data:', response);
            if (data.totalItems > 0) {
                const book = data.items[0].volumeInfo;
                const thumbnail = book.imageLinks?.thumbnail || book.imageLinks?.smallThumbnail || '';
                console.log('Thumbnail Found:', thumbnail);

                setForm(prev => ({
                    ...prev,
                    isbn,
                    title: book.title || '',
                    author: book.authors ? book.authors.join(', ') : '',
                    language: book.language || 'en',
                    thumbnail_url: thumbnail,
                }));
                Alert.alert('Book Found', `Autofilled details for: ${book.title}`);
            } else {
                Alert.alert('Not Found', 'Could not find book details for this ISBN.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch book details.');
            console.error(error);
        } finally {
            setLoadingBook(false);
        }
    };

    const handleScan = async () => {
        if (!permission?.granted) {
            const { granted } = await requestPermission();
            if (!granted) {
                Alert.alert('Permission needed', 'Camera permission is required to scan QR codes.');
                return;
            }
        }
        setScanning(true);
    };

    const onBarcodeScanned = ({ data }: { data: string }) => {
        setScanning(false);
        if (data !== form.isbn) {
            setForm(prev => ({ ...prev, isbn: data }));
            fetchBookDetails(data);
        }
    };

    const handleSave = async () => {
        // Validate
        if (!form.price) {
            Alert.alert('Missing Fields', 'Please fill in Price.');
            return;
        } else if (!form.stock) {
            Alert.alert('Missing Fields', 'Please fill in Stock.');
            return;
        }

        setSaving(true);
        console.log('Attempting to save book:', form);

        try {
            const payload = {
                isbn: form.isbn,
                title: form.title,
                author: form.author,
                price: parseFloat(form.price) || 0,
                stock: parseInt(form.stock) || 0,
                language: form.language,
                // If type is not in form state yet, default it or add to form state
                type: 'Paperback',
                thumbnail_url: form.thumbnail_url || null,
            };

            console.log('Payload:', payload);

            const { data, error } = await supabase
                .from('books')
                .insert(payload)
                .select();

            console.log('Supabase Response:', { data, error });

            if (error) {
                console.error('Supabase Error:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('No data returned. Check RLS policies.');
            }

            Alert.alert('Success', 'Book added successfully!');
            router.back();
        } catch (error: any) {
            console.error('Save Failure:', error);
            Alert.alert('Error Saving', error.message || 'Unknown error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (scanning) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView
                    style={StyleSheet.absoluteFill}
                    onBarcodeScanned={onBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr", "ean13"],
                    }}
                />
                <TouchableOpacity style={styles.closeCamera} onPress={() => setScanning(false)}>
                    <Ionicons name="close-circle" size={50} color="white" />
                </TouchableOpacity>
                <View style={styles.scanOverlay}>
                    <Text style={styles.scanText}>Align code within frame</Text>
                    <View style={styles.scanFrame} />
                </View>
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
                <TouchableOpacity onPress={handleSave} disabled={saving}>
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
                            style={[styles.scanButton, { backgroundColor: Colors.yss.secondaryOrange, marginRight: 5 }]}
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
                            placeholder="0"
                            keyboardType="numeric"
                        />
                    </View>
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
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scanButton: {
        backgroundColor: Colors.yss.orange,
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
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
});
