import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';

interface Offer {
    id: string;
    name: string;
    discount_percentage: number;
    is_active: boolean;
    created_at: string;
}

export default function OffersScreen() {
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [offerName, setOfferName] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('');

    useFocusEffect(
        useCallback(() => {
            fetchOffers();
        }, [])
    );

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOffers(data || []);
        } catch (error) {
            console.error('Error fetching offers:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to load offers');
            } else {
                Alert.alert('Error', 'Failed to load offers');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleOfferStatus = async (offer: Offer) => {
        try {
            const { error } = await supabase
                .from('offers')
                .update({ is_active: !offer.is_active })
                .eq('id', offer.id);

            if (error) throw error;

            setOffers(prev =>
                prev.map(o =>
                    o.id === offer.id ? { ...o, is_active: !o.is_active } : o
                )
            );
        } catch (error) {
            console.error('Error toggling offer:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to update offer status');
            } else {
                Alert.alert('Error', 'Failed to update offer status');
            }
        }
    };

    const openModal = (offer?: Offer) => {
        if (offer) {
            setEditingOffer(offer);
            setOfferName(offer.name);
            setDiscountPercentage(offer.discount_percentage.toString());
        } else {
            setEditingOffer(null);
            setOfferName('');
            setDiscountPercentage('');
        }
        setModalVisible(true);
    };

    const saveOffer = async () => {
        if (!offerName.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Please enter an offer name');
            } else {
                Alert.alert('Validation', 'Please enter an offer name');
            }
            return;
        }

        const discount = parseFloat(discountPercentage);
        if (isNaN(discount) || discount < 0 || discount > 100) {
            if (Platform.OS === 'web') {
                window.alert('Please enter a valid discount (0-100)');
            } else {
                Alert.alert('Validation', 'Please enter a valid discount (0-100)');
            }
            return;
        }

        setSaving(true);
        try {
            if (editingOffer) {
                // Update existing offer
                const { error } = await supabase
                    .from('offers')
                    .update({
                        name: offerName.trim(),
                        discount_percentage: discount
                    })
                    .eq('id', editingOffer.id);

                if (error) throw error;
            } else {
                // Create new offer
                const { error } = await supabase
                    .from('offers')
                    .insert({
                        name: offerName.trim(),
                        discount_percentage: discount,
                        is_active: false // New offers start inactive
                    });

                if (error) throw error;
            }

            setModalVisible(false);
            fetchOffers();
        } catch (error: any) {
            console.error('Error saving offer:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to save offer: ' + (error.message || 'Unknown error'));
            } else {
                Alert.alert('Error', 'Failed to save offer');
            }
        } finally {
            setSaving(false);
        }
    };

    const deleteOffer = async (offer: Offer) => {
        const confirmDelete = () => {
            return new Promise<boolean>((resolve) => {
                if (Platform.OS === 'web') {
                    resolve(window.confirm(`Delete "${offer.name}"?`));
                } else {
                    Alert.alert(
                        'Delete Offer',
                        `Are you sure you want to delete "${offer.name}"?`,
                        [
                            { text: 'Cancel', onPress: () => resolve(false) },
                            { text: 'Delete', onPress: () => resolve(true), style: 'destructive' }
                        ]
                    );
                }
            });
        };

        const confirmed = await confirmDelete();
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('offers')
                .delete()
                .eq('id', offer.id);

            if (error) throw error;
            setOffers(prev => prev.filter(o => o.id !== offer.id));
        } catch (error) {
            console.error('Error deleting offer:', error);
            if (Platform.OS === 'web') {
                window.alert('Failed to delete offer');
            } else {
                Alert.alert('Error', 'Failed to delete offer');
            }
        }
    };

    const renderOffer = ({ item }: { item: Offer }) => (
        <View style={styles.offerCard}>
            <View style={styles.offerInfo}>
                <View style={styles.offerHeader}>
                    <Text style={styles.offerName}>{item.name}</Text>
                    <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                        <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
                            {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
                <Text style={styles.discountText}>{item.discount_percentage}% off</Text>
            </View>

            <View style={styles.offerActions}>
                <Switch
                    value={item.is_active}
                    onValueChange={() => toggleOfferStatus(item)}
                    trackColor={{ false: '#ddd', true: Colors.yss.orange }}
                    thumbColor={item.is_active ? Colors.yss.white : '#f4f3f4'}
                />
                <TouchableOpacity style={styles.editButton} onPress={() => openModal(item)}>
                    <Ionicons name="pencil" size={18} color={Colors.yss.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteOffer(item)}>
                    <Ionicons name="trash-outline" size={18} color="#e53935" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Offers Management</Text>
                <TouchableOpacity onPress={() => openModal()} style={styles.addButton}>
                    <Ionicons name="add" size={24} color={Colors.yss.orange} />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={20} color={Colors.yss.orange} />
                <Text style={styles.infoText}>
                    General offers apply to all items without product-specific offers.
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.yss.orange} />
                </View>
            ) : (
                <FlatList
                    data={offers}
                    renderItem={renderOffer}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="pricetag-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No offers yet</Text>
                            <Text style={styles.emptySubText}>Tap + to create your first offer</Text>
                        </View>
                    }
                />
            )}

            {/* Add/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingOffer ? 'Edit Offer' : 'New Offer'}
                        </Text>

                        <Text style={styles.inputLabel}>Offer Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., New Year Sale"
                            value={offerName}
                            onChangeText={setOfferName}
                            autoFocus
                        />

                        <Text style={styles.inputLabel}>Discount Percentage</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 10"
                            value={discountPercentage}
                            onChangeText={setDiscountPercentage}
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={saveOffer}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    {editingOffer ? 'Update Offer' : 'Create Offer'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    addButton: {
        padding: 5,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff3e0',
        padding: 12,
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 10,
        gap: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#e65100',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    offerCard: {
        backgroundColor: Colors.yss.white,
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    offerInfo: {
        flex: 1,
    },
    offerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    offerName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    activeBadge: {
        backgroundColor: '#e8f5e9',
    },
    inactiveBadge: {
        backgroundColor: '#f5f5f5',
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    activeText: {
        color: '#2e7d32',
    },
    inactiveText: {
        color: '#999',
    },
    discountText: {
        fontSize: 14,
        color: Colors.yss.orange,
        fontWeight: '500',
    },
    offerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    editButton: {
        padding: 8,
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.yss.text,
        marginTop: 15,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        marginTop: 5,
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
        minHeight: 300,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: Colors.yss.text,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.yss.text,
        marginBottom: 8,
        marginLeft: 4,
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
    saveButton: {
        backgroundColor: Colors.yss.orange,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    disabledButton: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    cancelButton: {
        padding: 15,
        alignItems: 'center',
        marginTop: 5,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
});
