import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';

interface Sale {
    id: string;
    total_amount: number;
    discount_applied: number;
    created_at: string;
    sold_by: string | null;
    notes: string | null;
    profiles: {
        email: string;
    } | null;
    sale_items: {
        quantity: number;
        price_at_sale: number;
        books: {
            title: string;
            isbn: string;
        };
    }[];
}

export default function SalesHistoryScreen() {
    const router = useRouter();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    *,
                    profiles:sold_by(email),
                    sale_items(
                        quantity,
                        price_at_sale,
                        books(title, isbn)
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error('Error fetching sales:', error);
        } finally {
            setLoading(false);
        }
    };

    const openDetails = (sale: Sale) => {
        setSelectedSale(sale);
        setDetailsVisible(true);
    };

    const renderSaleItem = ({ item }: { item: Sale }) => {
        const date = new Date(item.created_at);
        const soldBy = item.profiles?.email || 'Unknown';
        const itemCount = item.sale_items.reduce((sum, si) => sum + si.quantity, 0);

        return (
            <TouchableOpacity
                style={styles.saleCard}
                onPress={() => openDetails(item)}
            >
                <View style={styles.saleHeader}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={16} color={Colors.yss.orange} />
                        <Text style={styles.saleDate}>
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={styles.saleAmount}>₹{item.total_amount.toFixed(2)}</Text>
                </View>

                <View style={styles.saleInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.infoText}>{soldBy}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="cart-outline" size={14} color="#666" />
                        <Text style={styles.infoText}>{itemCount} items</Text>
                    </View>
                </View>

                {item.discount_applied > 0 && (
                    <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>Offer: -₹{item.discount_applied.toFixed(2)}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sales History</Text>
                <TouchableOpacity onPress={fetchSales} style={styles.backButton}>
                    <Ionicons name="refresh" size={24} color={Colors.yss.orange} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.yss.orange} />
                </View>
            ) : (
                <FlatList
                    data={sales}
                    keyExtractor={item => item.id}
                    renderItem={renderSaleItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No sales yet</Text>
                        </View>
                    }
                />
            )}

            {/* Sale Details Modal */}
            <Modal
                visible={detailsVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sale Details</Text>
                            <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                                <Ionicons name="close" size={28} color={Colors.yss.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedSale && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Date & Time</Text>
                                    <Text style={styles.detailValue}>
                                        {new Date(selectedSale.created_at).toLocaleString()}
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Sold By</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedSale.profiles?.email || 'Unknown'}
                                    </Text>
                                </View>

                                {selectedSale.notes && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Notes</Text>
                                        <Text style={styles.detailValue}>{selectedSale.notes}</Text>
                                    </View>
                                )}

                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Items</Text>
                                    {selectedSale.sale_items.map((item, index) => (
                                        <View key={index} style={styles.itemRow}>
                                            <Text style={styles.itemTitle}>{item.books.title}</Text>
                                            <Text style={styles.itemQty}>x{item.quantity}</Text>
                                            <Text style={styles.itemPrice}>
                                                ₹{(item.price_at_sale * item.quantity).toFixed(2)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.totalSection}>
                                    {selectedSale.discount_applied > 0 && (
                                        <>
                                            <View style={styles.totalRow}>
                                                <Text style={styles.totalLabel}>Subtotal</Text>
                                                <Text style={styles.totalValue}>
                                                    ₹{(selectedSale.total_amount + selectedSale.discount_applied).toFixed(2)}
                                                </Text>
                                            </View>
                                            <View style={styles.totalRow}>
                                                <Text style={styles.discountLabel}>Offer</Text>
                                                <Text style={styles.discountValue}>
                                                    -₹{selectedSale.discount_applied.toFixed(2)}
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                    <View style={[styles.totalRow, styles.finalTotal]}>
                                        <Text style={styles.finalTotalLabel}>Total</Text>
                                        <Text style={styles.finalTotalValue}>
                                            ₹{selectedSale.total_amount.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>
                        )}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginTop: 16,
    },
    saleCard: {
        backgroundColor: Colors.yss.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    saleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    saleDate: {
        fontSize: 14,
        color: Colors.yss.text,
        fontWeight: '500',
    },
    saleAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.yss.orange,
    },
    saleInfo: {
        flexDirection: 'row',
        gap: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#666',
    },
    discountBadge: {
        marginTop: 8,
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    discountText: {
        fontSize: 12,
        color: '#2e7d32',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.yss.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    modalBody: {
        padding: 20,
    },
    detailSection: {
        marginBottom: 20,
    },
    detailLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 15,
        color: Colors.yss.text,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    itemTitle: {
        flex: 1,
        fontSize: 14,
        color: Colors.yss.text,
    },
    itemQty: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 12,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    totalSection: {
        marginTop: 10,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: '#f0f0f0',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    totalLabel: {
        fontSize: 14,
        color: '#666',
    },
    totalValue: {
        fontSize: 14,
        color: '#666',
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
    finalTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    finalTotalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    finalTotalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.yss.orange,
    },
});
