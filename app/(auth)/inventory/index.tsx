import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';

// Book Type
type Book = {
    id: string;
    title: string;
    author: string;
    price: number;
    stock: number;
    isbn: string;
    language: string;
    type: string;
    thumbnail_url?: string;
};

// Default YSS Placeholder (Using a generic spiritual book icon equivalent if URL fails, 
// for now using a public placeholder, User can update later)
const DEFAULT_THUMBNAIL = 'https://via.placeholder.com/150x200.png?text=YSS+Book';

export default function InventoryScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            fetchBooks();
        }, [])
    );

    const fetchBooks = async () => {
        try {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .order('title', { ascending: true });

            if (error) throw error;
            setBooks(data || []);
        } catch (error) {
            console.error('Error fetching books:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.isbn && book.isbn.includes(searchQuery))
    );

    const renderItem = ({ item }: { item: Book }) => (
        <View style={styles.bookCard}>
            <View style={styles.bookIcon}>
                {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} resizeMode="cover" />
                ) : (
                    <Ionicons name="book" size={24} color={Colors.yss.orange} />
                )}
            </View>
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.bookMeta}>{item.language} • {item.type}</Text>
                </View>
                <Text style={styles.bookStock}>Stock: <Text style={{ fontWeight: 'bold' }}>{item.stock}</Text></Text>
            </View>
            <View style={styles.bookPrice}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.amount}>{item.price}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Inventory</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={Colors.yss.icon} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search books..."
                    placeholderTextColor={Colors.yss.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredBooks}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No books found.'}</Text>
                    </View>
                }
            />

            {/* FAB to Add Book */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(auth)/inventory/add')}
            >
                <Ionicons name="add" size={30} color={Colors.yss.white} />
                <Text style={styles.fabText}>Add New</Text>
            </TouchableOpacity>

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
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'serif',
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 25, // Pill shape
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.yss.text,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for FAB
    },
    bookCard: {
        flexDirection: 'row',
        backgroundColor: Colors.yss.white,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    bookIcon: {
        width: 50,
        height: 75,
        backgroundColor: Colors.yss.cream,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    bookInfo: {
        flex: 1,
    },
    bookTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.yss.text,
        fontFamily: 'serif',
        marginBottom: 4,
    },
    bookAuthor: {
        fontSize: 14,
        color: Colors.yss.text,
        opacity: 0.7,
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    bookMeta: {
        fontSize: 12,
        color: Colors.yss.secondaryOrange,
        fontWeight: '500',
    },
    bookStock: {
        fontSize: 12,
        color: Colors.yss.text,
        opacity: 0.6,
    },
    bookPrice: {
        alignItems: 'flex-end',
    },
    currency: {
        fontSize: 12,
        color: Colors.yss.orange,
        fontWeight: 'bold',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.yss.orange,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: Colors.yss.orange,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        shadowColor: Colors.yss.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    fabText: {
        color: Colors.yss.white,
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: Colors.yss.icon,
        fontSize: 16,
    }
});
