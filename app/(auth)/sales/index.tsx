import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

interface CartItem {
    book_id: string;
    isbn: string;
    title: string;
    price: number;
    quantity: number;
}

interface Offer {
    id: string;
    name: string;
    discount_percentage: number;
    is_active: boolean;
}

export default function SalesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [scanning, setScanning] = useState(false);
    const [torch, setTorch] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [processing, setProcessing] = useState(false); // For adding items state

    // Checkout State
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [saleNotes, setSaleNotes] = useState('');
    const [customDiscount, setCustomDiscount] = useState('');
    const [generatingBill, setGeneratingBill] = useState(false);

    // Offer State
    const [activeOffer, setActiveOffer] = useState<Offer | null>(null);

    // Search Modal State
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Web Scanner Ref
    const scannerRef = useRef<any>(null);
    const lastScannedCode = useRef<string | null>(null);
    const lastScanTime = useRef<number>(0);

    // Fetch active offer on mount
    useEffect(() => {
        const fetchActiveOffer = async () => {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('is_active', true)
                .limit(1)
                .single();

            if (data && !error) {
                setActiveOffer(data);
            }
        };
        fetchActiveOffer();
    }, []);

    const checkPermission = async () => {
        if (Platform.OS !== 'web' && !permission?.granted) {
            const { granted } = await requestPermission();
            return granted;
        }
        return true;
    };

    const addToCart = async (isbn: string) => {
        setProcessing(true);
        try {
            // Check availability in DB
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('isbn', isbn)
                .single();

            if (error || !data) {
                window.alert("Scanned product not found in inventory.");
                return;
            }

            // Check if already in cart
            setCart(prevCart => {
                const existingIndex = prevCart.findIndex(item => item.book_id === data.id);
                if (existingIndex >= 0) {
                    // Increment
                    const newCart = [...prevCart];
                    newCart[existingIndex].quantity += 1;
                    console.log('Updated quantity for existing item:', newCart[existingIndex]);
                    return newCart;
                } else {
                    // Add new
                    const newItem = {
                        book_id: data.id,
                        isbn: data.isbn,
                        title: data.title,
                        price: data.price,
                        quantity: 1
                    };
                    console.log('Adding new item to cart:', newItem);
                    return [...prevCart, newItem];
                }
            });

            // Feedback (Toast or Sound could go here)
            if (Platform.OS === 'web') {
                // Simple web feedback
                console.log(`Added ${data.title}`);
            }

        } catch (err: any) {
            console.error('Caught error in addToCart:', err);
        } finally {
            setProcessing(false);
            console.log('addToCart completed');
        }
    };

    const onBarcodeScanned = ({ data }: { data: string }) => {
        setScanning(false);
        setTorch(false);
        // Stop web scanner if running
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
            scannerRef.current = null;
        }

        // Add to cart
        addToCart(data);
    };

    // Web Scanner Effect
    React.useEffect(() => {
        console.log('useEffect triggered. scanning:', scanning, 'Platform:', Platform.OS);
        if (scanning && Platform.OS === 'web') {
            console.log('Starting web scanner...');
            const { Html5Qrcode } = require('html5-qrcode');

            const startScanner = async () => {
                const html5QrCode = new Html5Qrcode("sales-reader");
                scannerRef.current = html5QrCode;

                try {
                    console.log('Calling html5QrCode.start()...');
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
                            console.log('Web scanner detected code:', decodedText);
                            onBarcodeScanned({ data: decodedText });
                        },
                        (errorMessage: string) => {
                            // Ignore scanning errors (happens frequently)
                        }
                    );
                    console.log('Web scanner started successfully');
                } catch (err) {
                    console.error("Error starting web scanner", err);
                    setScanning(false);
                    Alert.alert("Error", "Could not start camera.");
                }
            };

            setTimeout(startScanner, 100);

            return () => {
                console.log('Cleaning up web scanner...');
                if (scannerRef.current) {
                    scannerRef.current.stop().catch(console.error);
                }
            };
        }
    }, [scanning]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setCheckoutVisible(true);
    };

    const getSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const getDiscountAmount = () => {
        if (!activeOffer) return 0;
        return (getSubtotal() * activeOffer.discount_percentage) / 100;
    };

    const getCustomDiscountAmount = () => {
        const amount = parseFloat(customDiscount);
        return isNaN(amount) ? 0 : amount;
    };

    const getTotal = () => {
        return getSubtotal() - getDiscountAmount() - getCustomDiscountAmount();
    };

    // Save sale to database (sales + sale_items tables)
    const saveSaleToDatabase = async (): Promise<boolean> => {
        try {
            const subtotal = getSubtotal();
            const discountAmount = getDiscountAmount();
            const customDiscountAmount = getCustomDiscountAmount();
            const totalDiscountApplied = discountAmount + customDiscountAmount;
            const total = getTotal();

            // 1. Insert into sales table
            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert({
                    total_amount: total,
                    discount_applied: totalDiscountApplied,
                    notes: saleNotes.trim() || null,
                    sold_by: user?.id || null,
                })
                .select()
                .single();

            if (saleError || !saleData) {
                console.error('Error creating sale:', saleError);
                window.alert('Failed to save sale. Please try again.');
                return false;
            }

            // 2. Insert into sale_items table
            const saleItems = cart.map(item => ({
                sale_id: saleData.id,
                book_id: item.book_id,
                quantity: item.quantity,
                price_at_sale: item.price,
            }));

            const { error: itemsError } = await supabase
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) {
                console.error('Error creating sale items:', itemsError);
                window.alert('Sale created but items failed to save.');
                return false;
            }

            // 3. Reduce stock for each book sold
            for (const item of cart) {
                // Get current stock
                const { data: bookData, error: fetchError } = await supabase
                    .from('books')
                    .select('stock')
                    .eq('id', item.book_id)
                    .single();

                if (fetchError) {
                    console.error('Error fetching book stock:', fetchError);
                    continue;
                }

                if (bookData) {
                    const newStock = (bookData.stock || 0) - item.quantity;
                    console.log(`Updating stock for book ${item.book_id}: ${bookData.stock} -> ${newStock}`);

                    const { error: updateError } = await supabase
                        .from('books')
                        .update({ stock: newStock })
                        .eq('id', item.book_id);

                    if (updateError) {
                        console.error('Error updating stock for book:', item.book_id, updateError);
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error saving sale:', error);
            window.alert('An unexpected error occurred. Please try again.');
            return false;
        }
    };

    const shareBillToWhatsApp = async () => {
        if (!customerPhone) {
            Alert.alert("Missing Phone", "Please enter a WhatsApp number to share the bill.");
            return;
        }

        setGeneratingBill(true);
        try {
            // IMPORTANT: Save to database FIRST before opening WhatsApp
            // This ensures data is saved even if app goes to background
            const saved = await saveSaleToDatabase();
            if (!saved) {
                setGeneratingBill(false);
                return; // Don't proceed if save failed
            }

            const total = getTotal();
            const discountAmount = getDiscountAmount();
            const customDiscountAmount = getCustomDiscountAmount();
            const subtotal = getSubtotal();
            const date = new Date().toLocaleString();

            // Clean phone number (remove spaces, dashes, etc.)
            let cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '');
            // Add country code if not present
            if (!cleanPhone.startsWith('+')) {
                cleanPhone = '+91' + cleanPhone; // Default to India
            }
            // Remove the + for wa.me URL
            cleanPhone = cleanPhone.replace('+', '');

            // Create bill summary message
            const itemsList = cart.map(item =>
                `• ${item.title} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');

            // Include discount info if applicable
            let billMessage = `🙏 *Yogoda Satsanga Society (YSS) Pondy - Bill Receipt*\n\n` +
                `📅 Date: ${date}\n` +
                `👤 Name: Walk-in\n\n` +
                `📚 *Items:*\n${itemsList}\n\n`;

            // Show subtotal and combined offer if there are any discounts
            const totalOfferAmount = discountAmount + customDiscountAmount;
            if (totalOfferAmount > 0) {
                billMessage += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
                billMessage += `🎁 Offer: -₹${totalOfferAmount.toFixed(2)}\n`;
            }

            billMessage += `💰 *Total: ₹${total.toFixed(2)}*\n`;

            billMessage += `\nThank you for shopping with us!\n` +
                `Jai Guru 🙏`;

            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(billMessage)}`;

            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                // Clear cart BEFORE opening WhatsApp (data already saved to DB)
                setCheckoutVisible(false);
                setCart([]);
                setCustomerPhone('');
                setSaleNotes('');
                setCustomDiscount('');

                // Open WhatsApp last
                await Linking.openURL(whatsappUrl);
            } else {
                Alert.alert("WhatsApp Not Available", "Could not open WhatsApp. Please make sure it's installed.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to share bill via WhatsApp");
        } finally {
            setGeneratingBill(false);
        }
    };

    const updateQuantity = (bookId: string, delta: number) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.book_id === bookId) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            });
        });
    };

    // Search books in inventory
    const searchBooks = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%`)
                .limit(20);

            if (data && !error) {
                setSearchResults(data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Add book from search results to cart
    const addBookToCart = (book: any) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.book_id === book.id);
            if (existingIndex >= 0) {
                // Increment quantity
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += 1;
                return newCart;
            } else {
                // Add new item
                return [...prevCart, {
                    book_id: book.id,
                    isbn: book.isbn || '',
                    title: book.title,
                    price: book.price,
                    quantity: 1
                }];
            }
        });
        // Close search modal after adding
        setSearchVisible(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Scanner View
    if (scanning) {
        return (
            <View style={styles.cameraContainer}>
                {Platform.OS === 'web' ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <View nativeID="sales-reader" style={{ width: 500, maxWidth: '100%', height: 750, overflow: 'hidden' }} />
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
                    // Safely stop the scanner without throwing errors
                    if (scannerRef.current) {
                        try {
                            scannerRef.current.stop().catch(() => { });
                        } catch (e) {
                            // Ignore any errors when stopping scanner
                        }
                        scannerRef.current = null;
                    }
                }}>
                    <Ionicons name="close-circle" size={50} color="white" />
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                    <View style={styles.scanOverlay}>
                        <Text style={styles.scanText}>Align code within frame</Text>
                        <View style={styles.scanFrame} />
                    </View>
                )}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* ... Header ... */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Sale</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={cart}
                keyExtractor={item => item.book_id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="cart-outline" size={64} color="#ccc" />
                        <Text style={styles.emptyText}>Cart is empty</Text>
                        <Text style={styles.emptySubText}>Scan books to add them here</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.cartItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle}>{item.title}</Text>
                            <Text style={styles.itemSubtitle}>₹{item.price} each</Text>
                        </View>

                        <View style={styles.qtyContainer}>
                            <TouchableOpacity onPress={() => updateQuantity(item.book_id, -1)} style={styles.qtyButton}>
                                <Ionicons name="remove" size={16} color={Colors.yss.text} />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <TouchableOpacity onPress={() => updateQuantity(item.book_id, 1)} style={styles.qtyButton}>
                                <Ionicons name="add" size={16} color={Colors.yss.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>

                        <TouchableOpacity onPress={() => {
                            setCart(prev => prev.filter(i => i.book_id !== item.book_id));
                        }} style={{ marginLeft: 15 }}>
                            <Ionicons name="trash-outline" size={20} color={Colors.yss.orange} />
                        </TouchableOpacity>
                    </View>
                )}
            />
            {/* ... Footer ... */}

            <View style={styles.footer}>
                {/* Notes Input */}
                <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes for this sale (optional)..."
                    value={saleNotes}
                    onChangeText={setSaleNotes}
                    multiline
                    numberOfLines={2}
                />

                {/* Custom Discount Input */}
                <View style={styles.customDiscountRow}>
                    <Text style={styles.customDiscountLabel}>Special Discount (₹)</Text>
                    <TextInput
                        style={styles.customDiscountInput}
                        placeholder="0"
                        value={customDiscount}
                        onChangeText={setCustomDiscount}
                        keyboardType="numeric"
                    />
                </View>

                {/* Subtotal */}
                <View style={styles.subtotalRow}>
                    <Text style={styles.subtotalLabel}>Subtotal</Text>
                    <Text style={styles.subtotalValue}>₹{getSubtotal().toFixed(2)}</Text>
                </View>

                {/* Offer Discount Row - only show if offer is active */}
                {activeOffer && (
                    <View style={styles.discountRow}>
                        <Text style={styles.discountLabel}>
                            🎉 {activeOffer.name} ({activeOffer.discount_percentage}% off)
                        </Text>
                        <Text style={styles.discountValue}>-₹{getDiscountAmount().toFixed(2)}</Text>
                    </View>
                )}

                {/* Custom Discount Row - only show if custom discount is entered */}
                {getCustomDiscountAmount() > 0 && (
                    <View style={styles.customDiscountDisplayRow}>
                        <Text style={styles.customDiscountDisplayLabel}>✨ Special Discount</Text>
                        <Text style={styles.customDiscountDisplayValue}>-₹{getCustomDiscountAmount().toFixed(2)}</Text>
                    </View>
                )}

                {/* Total */}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>₹{getTotal().toFixed(2)}</Text>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.scanButton} onPress={async () => {
                        console.log('Scan Button Pressed');
                        const hasPermission = await checkPermission();
                        console.log('Has Permission:', hasPermission);
                        if (hasPermission) {
                            setScanning(true);
                            console.log('Scanning set to true');
                        }
                    }}>
                        <Ionicons name="scan" size={24} color="white" />
                        <Text style={styles.scanButtonText}>Scan</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => setSearchVisible(true)}
                    >
                        <Ionicons name="search" size={24} color="white" />
                        <Text style={styles.scanButtonText}>Search</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.checkoutButton, cart.length === 0 && styles.disabledButton]}
                        onPress={handleCheckout}
                        disabled={cart.length === 0}
                    >
                        <Text style={styles.checkoutText}>Checkout</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Checkout Modal */}
            <Modal visible={checkoutVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Checkout Details</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (WhatsApp - optional)"
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            style={styles.generateButton}
                            onPress={shareBillToWhatsApp}
                            disabled={generatingBill}
                        >
                            {generatingBill ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="logo-whatsapp" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateText}>Share Bill via WhatsApp</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.completeSaleButton}
                            onPress={async () => {
                                setGeneratingBill(true);
                                const saved = await saveSaleToDatabase();
                                setGeneratingBill(false);

                                if (saved) {
                                    setCheckoutVisible(false);
                                    setCart([]);
                                    setCustomerPhone('');
                                    setSaleNotes('');
                                    setCustomDiscount('');
                                    window.alert('Sale completed successfully!');
                                }
                            }}
                            disabled={generatingBill}
                        >
                            {generatingBill ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateText}>Complete Sale</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setCheckoutVisible(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Search Modal */}
            <Modal visible={searchVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={[styles.modalTitle, { flex: 1, marginBottom: 0 }]}>Search Books</Text>
                            <TouchableOpacity onPress={() => {
                                setSearchVisible(false);
                                setSearchQuery('');
                                setSearchResults([]);
                            }}>
                                <Ionicons name="close-circle" size={28} color={Colors.yss.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="Search by title, author, or ISBN..."
                                value={searchQuery}
                                onChangeText={(text) => {
                                    setSearchQuery(text);
                                    searchBooks(text);
                                }}
                                autoFocus
                            />
                        </View>

                        {searchLoading && (
                            <ActivityIndicator size="small" color={Colors.yss.orange} style={{ marginVertical: 20 }} />
                        )}

                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 400 }}
                            ListEmptyComponent={
                                !searchLoading && searchQuery ? (
                                    <Text style={{ textAlign: 'center', color: '#666', marginTop: 30 }}>
                                        No books found
                                    </Text>
                                ) : null
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.searchResultItem}
                                    onPress={() => addBookToCart(item)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.searchResultTitle}>{item.title}</Text>
                                        <Text style={styles.searchResultSubtitle}>
                                            {item.author || 'Unknown Author'} • ₹{item.price} • Stock: {item.stock}
                                        </Text>
                                    </View>
                                    <View style={styles.addButton}>
                                        <Ionicons name="add" size={20} color="white" />
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

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
        padding: 20,
        backgroundColor: Colors.yss.white,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    listContent: {
        padding: 20,
        paddingBottom: 380,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.yss.text,
        marginTop: 20,
    },
    emptySubText: {
        color: '#999',
        marginTop: 5,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.yss.white,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.yss.white,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    subtotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    subtotalLabel: {
        fontSize: 14,
        color: '#666',
    },
    subtotalValue: {
        fontSize: 14,
        color: '#666',
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        backgroundColor: '#e8f5e9',
        padding: 8,
        borderRadius: 8,
    },
    discountLabel: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '600',
    },
    discountValue: {
        fontSize: 14,
        color: '#2e7d32',
        fontWeight: '600',
    },
    notesInput: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        fontSize: 14,
        color: Colors.yss.text,
        minHeight: 50,
        textAlignVertical: 'top',
    },
    customDiscountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    customDiscountLabel: {
        fontSize: 14,
        color: Colors.yss.text,
        fontWeight: '500',
    },
    customDiscountInput: {
        backgroundColor: '#fff3e0',
        borderWidth: 1,
        borderColor: '#ffcc80',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.orange,
        width: 100,
        textAlign: 'center',
    },
    customDiscountDisplayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        backgroundColor: '#fff3e0',
        padding: 8,
        borderRadius: 8,
    },
    customDiscountDisplayLabel: {
        fontSize: 14,
        color: '#e65100',
        fontWeight: '600',
    },
    customDiscountDisplayValue: {
        fontSize: 14,
        color: '#e65100',
        fontWeight: '600',
    },
    totalLabel: {
        fontSize: 18,
        color: Colors.yss.text,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.yss.orange,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    scanButton: {
        flex: 1,
        backgroundColor: Colors.yss.text,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 8,
    },
    scanButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    searchButton: {
        flex: 1,
        backgroundColor: Colors.yss.secondaryOrange || '#F9A825',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    searchResultTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    searchResultSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.yss.orange,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    checkoutButton: {
        flex: 1,
        backgroundColor: Colors.yss.orange,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    checkoutText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 4,
    },
    qtyButton: {
        padding: 5,
    },
    qtyText: {
        marginHorizontal: 10,
        fontWeight: 'bold',
        fontSize: 14,
        color: Colors.yss.text,
    },
    // Scanner Styles
    cameraContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeCamera: {
        position: 'absolute',
        top: 40,
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
        width: 250,
        height: 350,
        borderWidth: 2,
        borderColor: Colors.yss.orange,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.yss.cream,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: Colors.yss.text,
    },
    input: {
        backgroundColor: Colors.yss.white,
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        fontSize: 16,
    },
    generateButton: {
        backgroundColor: '#25D366', // WhatsApp Green
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    completeSaleButton: {
        backgroundColor: Colors.yss.orange,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    generateText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 15,
        padding: 15,
        alignItems: 'center',
    },
    cancelText: {
        color: '#666',
        fontSize: 16,
    },
});
