import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { isPrinterConnected, print } from '../../../lib/bluetooth-printer';
import { ALIGN_CENTER, ALIGN_LEFT, CHARS_PER_LINE, EscPosEncoder, formatCurrency, truncateText } from '../../../lib/escpos';
import { supabase } from '../../../lib/supabase';

const CART_STORAGE_KEY = 'yss_pondy_cart';

interface AppliedOffer {
    type: 'product' | 'general' | 'none';
    name: string;
    discount_percentage: number;
}

interface CartItem {
    book_id: string;
    isbn: string;
    title: string;
    price: number;
    quantity: number;
    appliedOffer: AppliedOffer | null;
    offerRemoved: boolean; // User manually removed offer
    isCustomItem: boolean; // For temporary items (not in DB)
}

interface Offer {
    id: string;
    name: string;
    discount_percentage: number;
    is_active: boolean;
}

interface BookOffer {
    book_id: string;
    offer_name: string;
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
    const [processing, setProcessing] = useState(false);

    // Checkout State
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [customerPhone, setCustomerPhone] = useState('');
    const [saleNotes, setSaleNotes] = useState('');
    const [customDiscount, setCustomDiscount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gpay'>('cash');
    const [showNotes, setShowNotes] = useState(false);
    const [generatingBill, setGeneratingBill] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState<number | null>(null);

    // Offer State
    const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
    const [bookOffers, setBookOffers] = useState<Map<string, BookOffer>>(new Map());

    // Search Modal State
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Custom Item Modal State
    const [customItemVisible, setCustomItemVisible] = useState(false);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');

    // Web Scanner Ref
    const scannerRef = useRef<any>(null);
    const lastScannedCode = useRef<string | null>(null);
    const lastScanTime = useRef<number>(0);

    // Load cart from storage on mount
    useFocusEffect(
        useCallback(() => {
            loadCartFromStorage();
            fetchOffers();
        }, [])
    );

    // Save cart to storage whenever it changes
    useEffect(() => {
        if (cart.length > 0) {
            saveCartToStorage();
        }
    }, [cart]);

    const loadCartFromStorage = async () => {
        try {
            const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsedCart = JSON.parse(stored);
                setCart(parsedCart);
            }
        } catch (error) {
            console.error('Error loading cart:', error);
        }
    };

    const saveCartToStorage = async () => {
        try {
            await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    };

    const clearCartStorage = async () => {
        try {
            await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing cart:', error);
        }
    };

    const fetchOffers = async () => {
        // Fetch active general offer
        const { data: generalOffer, error: generalError } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .limit(1)
            .single();

        if (generalOffer && !generalError) {
            setActiveOffer(generalOffer);
        } else {
            setActiveOffer(null);
        }

        // Fetch all active book-specific offers
        const { data: productOffers, error: productError } = await supabase
            .from('book_offers')
            .select('*')
            .eq('is_active', true);

        console.log('Fetched book offers:', productOffers, 'Error:', productError);

        if (productOffers && !productError) {
            const offerMap = new Map<string, BookOffer>();
            productOffers.forEach(offer => {
                console.log('Mapping book offer:', offer.book_id, '->', offer.offer_name);
                offerMap.set(offer.book_id, offer);
            });
            setBookOffers(offerMap);
        }
    };

    const getOfferForBook = (bookId: string): AppliedOffer | null => {
        // Check for product-specific offer first (takes priority)
        const bookOffer = bookOffers.get(bookId);
        console.log('getOfferForBook called for:', bookId, 'Found product offer:', bookOffer, 'bookOffers size:', bookOffers.size);

        if (bookOffer) {
            return {
                type: 'product',
                name: bookOffer.offer_name,
                discount_percentage: bookOffer.discount_percentage
            };
        }

        // Fall back to general offer
        if (activeOffer) {
            return {
                type: 'general',
                name: activeOffer.name,
                discount_percentage: activeOffer.discount_percentage
            };
        }

        return null;
    };

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
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .eq('isbn', isbn)
                .single();

            if (error || !data) {
                window.alert("Scanned product not found in inventory.");
                return;
            }

            const offer = getOfferForBook(data.id);

            setCart(prevCart => {
                const existingIndex = prevCart.findIndex(item => item.book_id === data.id);
                if (existingIndex >= 0) {
                    const newCart = [...prevCart];
                    newCart[existingIndex].quantity += 1;
                    return newCart;
                } else {
                    const newItem: CartItem = {
                        book_id: data.id,
                        isbn: data.isbn,
                        title: data.title,
                        price: data.price,
                        quantity: 1,
                        appliedOffer: offer,
                        offerRemoved: false,
                        isCustomItem: false
                    };
                    return [...prevCart, newItem];
                }
            });

            if (Platform.OS === 'web') {
                console.log(`Added ${data.title}`);
            }
        } catch (err: any) {
            console.error('Caught error in addToCart:', err);
        } finally {
            setProcessing(false);
        }
    };

    const addCustomItem = () => {
        if (!customItemName.trim()) {
            window.alert('Please enter an item name');
            return;
        }
        const price = parseFloat(customItemPrice);
        if (isNaN(price) || price <= 0) {
            window.alert('Please enter a valid price');
            return;
        }

        // Custom items get general offer if available
        const customItemOffer: AppliedOffer | null = activeOffer ? {
            type: 'general',
            name: activeOffer.name,
            discount_percentage: activeOffer.discount_percentage
        } : null;

        const customItem: CartItem = {
            book_id: `custom_${Date.now()}`,
            isbn: '',
            title: customItemName.trim(),
            price: price,
            quantity: 1,
            appliedOffer: customItemOffer,
            offerRemoved: false,
            isCustomItem: true
        };

        setCart(prev => [...prev, customItem]);
        setCustomItemVisible(false);
        setCustomItemName('');
        setCustomItemPrice('');
    };

    const removeOfferFromItem = (bookId: string) => {
        setCart(prevCart =>
            prevCart.map(item =>
                item.book_id === bookId
                    ? { ...item, offerRemoved: true, appliedOffer: null }
                    : item
            )
        );
    };

    const restoreOfferToItem = (bookId: string) => {
        setCart(prevCart =>
            prevCart.map(item => {
                if (item.book_id === bookId && !item.isCustomItem) {
                    const offer = getOfferForBook(bookId);
                    return { ...item, offerRemoved: false, appliedOffer: offer };
                }
                return item;
            })
        );
    };

    const onBarcodeScanned = ({ data }: { data: string }) => {
        setScanning(false);
        setTorch(false);
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
            scannerRef.current = null;
        }
        addToCart(data);
    };

    // Web Scanner Effect
    React.useEffect(() => {
        if (scanning && Platform.OS === 'web') {
            const { Html5Qrcode } = require('html5-qrcode');

            const startScanner = async () => {
                const html5QrCode = new Html5Qrcode("sales-reader");
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
                        (errorMessage: string) => { }
                    );
                } catch (err) {
                    console.error("Error starting web scanner", err);
                    setScanning(false);
                    Alert.alert("Error", "Could not start camera.");
                }
            };

            setTimeout(startScanner, 100);

            return () => {
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

    const getItemDiscount = (item: CartItem): number => {
        if (item.offerRemoved || !item.appliedOffer) return 0;
        return (item.price * item.quantity * item.appliedOffer.discount_percentage) / 100;
    };

    const getTotalOfferDiscount = () => {
        return cart.reduce((sum, item) => sum + getItemDiscount(item), 0);
    };

    const getCustomDiscountAmount = () => {
        const amount = parseFloat(customDiscount);
        return isNaN(amount) ? 0 : amount;
    };

    const getTotal = () => {
        return getSubtotal() - getTotalOfferDiscount() - getCustomDiscountAmount();
    };

    const saveSaleToDatabase = async (): Promise<number | null> => {
        try {
            const subtotal = getSubtotal();
            const totalOfferDiscount = getTotalOfferDiscount();
            const customDiscountAmount = getCustomDiscountAmount();
            const totalDiscountApplied = totalOfferDiscount + customDiscountAmount;
            const total = getTotal();

            const { data: saleData, error: saleError } = await supabase
                .from('sales')
                .insert({
                    total_amount: total,
                    discount_applied: totalDiscountApplied,
                    notes: saleNotes.trim() || null,
                    sold_by: user?.id || null,
                    payment_method: paymentMethod,
                })
                .select('*')
                .single();

            if (saleError || !saleData) {
                console.error('Error creating sale:', saleError);
                const errorMsg = saleError?.message || 'Unknown error';
                window.alert('Failed to save sale: ' + errorMsg);
                return null;
            }

            // Only insert sale_items for non-custom items
            const saleItems = cart
                .filter(item => !item.isCustomItem)
                .map(item => ({
                    sale_id: saleData.id,
                    book_id: item.book_id,
                    quantity: item.quantity,
                    price_at_sale: item.price,
                }));

            if (saleItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('sale_items')
                    .insert(saleItems);

                if (itemsError) {
                    console.error('Error creating sale items:', itemsError);
                    window.alert('Sale created but items failed to save.');
                    return null;
                }
            }

            // Reduce stock for each book sold (not custom items)
            for (const item of cart.filter(i => !i.isCustomItem)) {
                const { data: bookData, error: fetchError } = await supabase
                    .from('books')
                    .select('stock')
                    .eq('id', item.book_id)
                    .single();

                if (fetchError) continue;

                if (bookData) {
                    const newStock = (bookData.stock || 0) - item.quantity;
                    await supabase
                        .from('books')
                        .update({ stock: newStock })
                        .eq('id', item.book_id);
                }
            }

            return saleData.invoice_number || null;
        } catch (error) {
            console.error('Error saving sale:', error);
            window.alert('An unexpected error occurred. Please try again.');
            return null;
        }
    };

    const shareBillToWhatsApp = async () => {
        if (!customerPhone) {
            Alert.alert("Missing Phone", "Please enter a WhatsApp number to share the bill.");
            return;
        }

        setGeneratingBill(true);
        try {
            const invoiceNum = await saveSaleToDatabase();
            if (!invoiceNum) {
                setGeneratingBill(false);
                return;
            }

            setCurrentInvoiceNumber(invoiceNum);

            const total = getTotal();
            const totalOfferDiscount = getTotalOfferDiscount();
            const customDiscountAmount = getCustomDiscountAmount();
            const subtotal = getSubtotal();
            const date = new Date().toLocaleString();

            let cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '');
            if (!cleanPhone.startsWith('+')) {
                cleanPhone = '+91' + cleanPhone;
            }
            cleanPhone = cleanPhone.replace('+', '');

            const itemsList = cart.map(item => {
                let line = `• ${item.title} x${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`;
                if (item.appliedOffer && !item.offerRemoved) {
                    line += ` (${item.appliedOffer.discount_percentage}% off)`;
                }
                return line;
            }).join('\n');

            let billMessage = `🙏 *Yogoda Satsanga Society of India*\n` +
                `*YSS Pondy - Bill Receipt*\n\n` +
                `🧾 Invoice #: ${invoiceNum}\n` +
                `📅 Date: ${date}\n` +
                `👤 Name: Walk-in\n\n` +
                `📚 *Items:*\n${itemsList}\n\n`;

            const totalOfferAmount = totalOfferDiscount + customDiscountAmount;
            if (totalOfferAmount > 0) {
                billMessage += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
                billMessage += `🎁 Discount: -₹${totalOfferAmount.toFixed(2)}\n`;
            }

            billMessage += `💰 *Total: ₹${total.toFixed(2)}*\n`;
            billMessage += `\nThank you for shopping with us!\n` +
                `🌸 Jai Guru 🌸`;

            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(billMessage)}`;

            const supported = await Linking.canOpenURL(whatsappUrl);
            if (supported) {
                setCheckoutVisible(false);
                setCart([]);
                await clearCartStorage();
                setCustomerPhone('');
                setSaleNotes('');
                setCustomDiscount('');
                setCurrentInvoiceNumber(null);
                await Linking.openURL(whatsappUrl);
            } else {
                Alert.alert("WhatsApp Not Available", "Could not open WhatsApp.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to share bill via WhatsApp");
        } finally {
            setGeneratingBill(false);
        }
    };

    const printReceipt = async () => {
        if (!isPrinterConnected()) {
            if (Platform.OS === 'web') {
                window.alert('No printer connected. Go to Settings > Printer Settings to connect.');
            } else {
                Alert.alert('No Printer', 'Please connect a printer in Settings first.');
            }
            return;
        }

        setPrinting(true);
        try {
            const encoder = new EscPosEncoder();
            const date = new Date().toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const subtotal = getSubtotal();
            const totalOfferDiscount = getTotalOfferDiscount();
            const customDiscountAmount = getCustomDiscountAmount();
            const totalDiscount = totalOfferDiscount + customDiscountAmount;
            const total = getTotal();

            // Build receipt
            encoder
                .init()
                .align(ALIGN_CENTER)
                .bold(true)
                .line('Yogoda Satsanga Society of India')
                .bold(false)
                .line('YSS Pondy');

            if (currentInvoiceNumber) {
                encoder.line(`Invoice #${currentInvoiceNumber}`);
            }

            encoder
                .line('')
                .align(ALIGN_LEFT)
                .line(date)
                .separator('=');

            // Items
            cart.forEach(item => {
                const name = truncateText(item.title, CHARS_PER_LINE - 12);
                const qty = `x${item.quantity}`;
                const price = formatCurrency(item.price * item.quantity);
                encoder.leftRight(`${name} ${qty}`, price);

                // Show per-item discount if applicable
                const discount = getItemDiscount(item);
                if (discount > 0 && item.appliedOffer) {
                    encoder.leftRight(`  ${item.appliedOffer.discount_percentage}% off`, `-${formatCurrency(discount)}`);
                }
            });

            encoder.separator('-');

            encoder.leftRight('Subtotal:', formatCurrency(subtotal));

            if (totalDiscount > 0) {
                encoder.leftRight('Discount:', `-${formatCurrency(totalDiscount)}`);
            }

            encoder
                .separator('=')
                .bold(true)
                .leftRight('TOTAL:', formatCurrency(total))
                .bold(false)
                .line('')
                .align(ALIGN_CENTER)
                .line('Thank you!')
                .line('* Jai Guru *')
                .feed(3)
                .cut();

            await print(encoder.encode());

            if (Platform.OS === 'web') {
                window.alert('Receipt printed successfully!');
            } else {
                Alert.alert('Success', 'Receipt printed!');
            }
        } catch (error: any) {
            console.error('Print error:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to print: ' + (error.message || 'Unknown error'));
            } else {
                Alert.alert('Print Error', error.message || 'Failed to print receipt');
            }
        } finally {
            setPrinting(false);
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

    const addBookToCart = (book: any) => {
        const offer = getOfferForBook(book.id);

        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.book_id === book.id);
            if (existingIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += 1;
                return newCart;
            } else {
                return [...prevCart, {
                    book_id: book.id,
                    isbn: book.isbn || '',
                    title: book.title,
                    price: book.price,
                    quantity: 1,
                    appliedOffer: offer,
                    offerRemoved: false,
                    isCustomItem: false
                }];
            }
        });
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
                    if (scannerRef.current) {
                        try {
                            scannerRef.current.stop().catch(() => { });
                        } catch (e) { }
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Sale</Text>
                <TouchableOpacity onPress={() => setCustomItemVisible(true)}>
                    <Ionicons name="add-circle-outline" size={28} color={Colors.yss.orange} />
                </TouchableOpacity>
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
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.itemTitle}>{item.title}</Text>
                                {item.isCustomItem && (
                                    <View style={styles.customBadge}>
                                        <Text style={styles.customBadgeText}>Custom</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.itemSubtitle}>₹{item.price} each</Text>

                            {/* Offer info */}
                            {item.appliedOffer && !item.offerRemoved && (
                                <View style={styles.offerBadge}>
                                    <Text style={styles.offerBadgeText}>
                                        🎉 {item.appliedOffer.name} ({item.appliedOffer.discount_percentage}% off)
                                    </Text>
                                    <TouchableOpacity onPress={() => removeOfferFromItem(item.book_id)}>
                                        <Ionicons name="close-circle" size={18} color="#e53935" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Restore offer button if removed */}
                            {item.offerRemoved && !item.isCustomItem && (
                                <TouchableOpacity
                                    style={styles.restoreOfferButton}
                                    onPress={() => restoreOfferToItem(item.book_id)}
                                >
                                    <Ionicons name="refresh" size={14} color="#2e7d32" />
                                    <Text style={styles.restoreOfferText}>Restore Offer</Text>
                                </TouchableOpacity>
                            )}
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

                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                            {getItemDiscount(item) > 0 && (
                                <Text style={styles.itemDiscountText}>-₹{getItemDiscount(item).toFixed(2)}</Text>
                            )}
                        </View>

                        <TouchableOpacity onPress={() => {
                            setCart(prev => prev.filter(i => i.book_id !== item.book_id));
                        }} style={{ marginLeft: 15 }}>
                            <Ionicons name="trash-outline" size={20} color={Colors.yss.orange} />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <View style={styles.footer}>
                {/* Payment Method Toggle */}
                <View style={styles.paymentMethodRow}>
                    <Text style={styles.paymentMethodLabel}>Payment:</Text>
                    <View style={styles.paymentToggle}>
                        <TouchableOpacity
                            style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionActive]}
                            onPress={() => setPaymentMethod('cash')}
                        >
                            <Ionicons name="cash-outline" size={16} color={paymentMethod === 'cash' ? 'white' : Colors.yss.text} />
                            <Text style={[styles.paymentOptionText, paymentMethod === 'cash' && styles.paymentOptionTextActive]}>Cash</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.paymentOption, paymentMethod === 'gpay' && styles.paymentOptionActive]}
                            onPress={() => setPaymentMethod('gpay')}
                        >
                            <Ionicons name="phone-portrait-outline" size={16} color={paymentMethod === 'gpay' ? 'white' : Colors.yss.text} />
                            <Text style={[styles.paymentOptionText, paymentMethod === 'gpay' && styles.paymentOptionTextActive]}>GPay</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Collapsible Notes & Discount Row */}
                <View style={styles.optionsRow}>
                    <TouchableOpacity style={styles.optionButton} onPress={() => setShowNotes(!showNotes)}>
                        <Ionicons name="create-outline" size={16} color={Colors.yss.text} />
                        <Text style={styles.optionButtonText}>Notes</Text>
                    </TouchableOpacity>
                    <View style={styles.discountInputRow}>
                        <Text style={styles.discountInputLabel}>Discount ₹</Text>
                        <TextInput
                            style={styles.discountInputSmall}
                            placeholder="0"
                            value={customDiscount}
                            onChangeText={setCustomDiscount}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Notes Input - Only shown when expanded */}
                {showNotes && (
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Add notes for this sale..."
                        value={saleNotes}
                        onChangeText={setSaleNotes}
                        multiline
                        numberOfLines={2}
                    />
                )}

                {/* Totals Section - Compact */}
                <View style={styles.totalsCompact}>
                    <View style={styles.totalsLeft}>
                        {getTotalOfferDiscount() > 0 && (
                            <Text style={styles.discountTextSmall}>🎉 -₹{getTotalOfferDiscount().toFixed(0)}</Text>
                        )}
                        {getCustomDiscountAmount() > 0 && (
                            <Text style={styles.discountTextSmall}>✨ -₹{getCustomDiscountAmount().toFixed(0)}</Text>
                        )}
                    </View>
                    <View style={styles.totalsRight}>
                        <Text style={styles.totalLabelCompact}>Total</Text>
                        <Text style={styles.totalValueCompact}>₹{getTotal().toFixed(2)}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.scanButtonCompact} onPress={async () => {
                        const hasPermission = await checkPermission();
                        if (hasPermission) {
                            setScanning(true);
                        }
                    }}>
                        <Ionicons name="scan" size={20} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.searchButtonCompact}
                        onPress={() => setSearchVisible(true)}
                    >
                        <Ionicons name="search" size={20} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.checkoutButtonCompact, cart.length === 0 && styles.disabledButton]}
                        onPress={handleCheckout}
                        disabled={cart.length === 0}
                    >
                        <Text style={styles.checkoutText}>Checkout</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" />
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
                                const invoiceNum = await saveSaleToDatabase();
                                setGeneratingBill(false);

                                if (invoiceNum) {
                                    setCurrentInvoiceNumber(invoiceNum);
                                    setSaleCompleted(true);
                                    window.alert(`Sale completed! Invoice #${invoiceNum}`);
                                }
                            }}
                            disabled={generatingBill || saleCompleted}
                        >
                            {generatingBill ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateText}>
                                        {saleCompleted && currentInvoiceNumber ? `Invoice #${currentInvoiceNumber}` : 'Complete Sale'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.printButton}
                            onPress={async () => {
                                // If sale not completed yet, complete it first
                                if (!saleCompleted) {
                                    setPrinting(true);
                                    const invoiceNum = await saveSaleToDatabase();
                                    if (invoiceNum) {
                                        setCurrentInvoiceNumber(invoiceNum);
                                        setSaleCompleted(true);
                                    } else {
                                        setPrinting(false);
                                        return; // Don't print if save failed
                                    }
                                }

                                await printReceipt();
                                setPrinting(false);
                                setCheckoutVisible(false);
                                setCart([]);
                                await clearCartStorage();
                                setCustomerPhone('');
                                setSaleNotes('');
                                setCustomDiscount('');
                                setSaleCompleted(false);
                                setCurrentInvoiceNumber(null);
                            }}
                            disabled={printing}
                        >
                            {printing ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="print" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateText}>Print Receipt</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setCheckoutVisible(false);
                                if (saleCompleted) {
                                    setCart([]);
                                    clearCartStorage();
                                    setCustomerPhone('');
                                    setSaleNotes('');
                                    setCustomDiscount('');
                                    setSaleCompleted(false);
                                    setCurrentInvoiceNumber(null);
                                }
                            }}
                        >
                            <Text style={styles.cancelText}>{saleCompleted ? 'Close' : 'Cancel'}</Text>
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

            {/* Custom Item Modal */}
            <Modal visible={customItemVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Custom Item</Text>
                        <Text style={styles.customItemInfo}>
                            Custom items are temporary and won't be saved to inventory.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Item Name"
                            value={customItemName}
                            onChangeText={setCustomItemName}
                            autoFocus
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Price (₹)"
                            value={customItemPrice}
                            onChangeText={setCustomItemPrice}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={styles.completeSaleButton}
                            onPress={addCustomItem}
                        >
                            <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.generateText}>Add to Cart</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setCustomItemVisible(false);
                                setCustomItemName('');
                                setCustomItemPrice('');
                            }}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
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
    itemDiscountText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: '500',
    },
    customBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    customBadgeText: {
        fontSize: 10,
        color: '#1976d2',
        fontWeight: '600',
    },
    offerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginTop: 6,
        gap: 8,
    },
    offerBadgeText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: '500',
        flex: 1,
    },
    restoreOfferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    restoreOfferText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: '500',
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
        backgroundColor: '#25D366',
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
    printButton: {
        backgroundColor: '#2196F3',
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
    customItemInfo: {
        fontSize: 13,
        color: '#666',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    // Mobile-optimized footer styles
    paymentMethodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    paymentMethodLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    paymentToggle: {
        flexDirection: 'row',
        gap: 8,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    paymentOptionActive: {
        backgroundColor: Colors.yss.orange,
        borderColor: Colors.yss.orange,
    },
    paymentOptionText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.yss.text,
    },
    paymentOptionTextActive: {
        color: 'white',
    },
    optionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#f5f5f5',
        borderRadius: 15,
    },
    optionButtonText: {
        fontSize: 12,
        color: Colors.yss.text,
    },
    discountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    discountInputLabel: {
        fontSize: 13,
        color: Colors.yss.text,
        fontWeight: '500',
    },
    discountInputSmall: {
        backgroundColor: '#fff3e0',
        borderWidth: 1,
        borderColor: '#ffcc80',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.yss.orange,
        width: 70,
        textAlign: 'center',
    },
    totalsCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginBottom: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    totalsLeft: {
        flexDirection: 'row',
        gap: 10,
    },
    discountTextSmall: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: '500',
    },
    totalsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    totalLabelCompact: {
        fontSize: 14,
        color: Colors.yss.text,
        fontWeight: '500',
    },
    totalValueCompact: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.yss.orange,
    },
    scanButtonCompact: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.yss.text,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonCompact: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.yss.secondaryOrange || '#F9A825',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkoutButtonCompact: {
        flex: 1,
        marginLeft: 10,
        backgroundColor: Colors.yss.orange,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
});
