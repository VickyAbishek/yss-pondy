import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
    const { user, session } = useAuth();
    const router = useRouter();

    // Stats from database
    const [booksCount, setBooksCount] = useState<number>(0);
    const [todaySalesCount, setTodaySalesCount] = useState<number>(0);

    // Profile dropdown state
    const [dropdownVisible, setDropdownVisible] = useState(false);

    // Get user's first name from Google profile or email
    const getUserFirstName = () => {
        // Try to get from Google user metadata first
        const fullName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name;
        if (fullName) {
            return fullName.split(' ')[0];
        }
        // Fallback to email username
        return user?.email?.split('@')[0] || 'User';
    };

    // Fetch stats on mount
    useEffect(() => {
        const fetchStats = async () => {
            // Get total books count (sum of all stock)
            const { data: booksData, error: booksError } = await supabase
                .from('books')
                .select('stock');

            if (booksData && !booksError) {
                const totalStock = booksData.reduce((sum, book) => sum + (book.stock || 0), 0);
                setBooksCount(totalStock);
            }

            // Get today's sales count
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count, error: salesError } = await supabase
                .from('sales')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());

            if (count !== null && !salesError) {
                setTodaySalesCount(count);
            }
        };

        fetchStats();
    }, []);

    const stats = [
        { label: 'Books in Stock', value: booksCount.toLocaleString(), icon: 'book' },
        { label: 'Today Sales', value: todaySalesCount.toString(), icon: 'basket' },
    ];

    const actions = [
        { label: 'New Sale', icon: 'add-circle', route: '/(auth)/sales' },
        { label: 'Inventory', icon: 'list', route: '/(auth)/inventory' },
        { label: 'Reports', icon: 'bar-chart', route: '/(auth)/reports' },
        { label: 'Users', icon: 'people', route: '/(auth)/admin/users' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Jai Guru,</Text>
                    <Text style={styles.userName}>{getUserFirstName()}.</Text>
                </View>
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => setDropdownVisible(!dropdownVisible)}
                >
                    <Ionicons name="person-circle-outline" size={40} color={Colors.yss.orange} />
                </TouchableOpacity>
            </View>

            {/* Profile Dropdown Menu */}
            {dropdownVisible && (
                <View style={styles.dropdownContainer}>
                    <View style={styles.dropdown}>
                        <View style={styles.dropdownHeader}>
                            <Text style={styles.dropdownEmail}>{user?.email}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={async () => {
                                setDropdownVisible(false);
                                await supabase.auth.signOut();
                                router.replace('/');
                            }}
                        >
                            <Ionicons name="log-out-outline" size={20} color={Colors.yss.text} />
                            <Text style={styles.dropdownItemText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={() => dropdownVisible && setDropdownVisible(false)}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <View style={styles.statHeader}>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                    <Ionicons name={stat.icon as any} size={20} color={Colors.yss.orange} />
                                </View>
                                <Text style={styles.statValue}>{stat.value}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Actions Grid */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.grid}>
                        {actions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.actionCard}
                                onPress={() => router.push(action.route as any)}
                            >
                                <View style={styles.iconCircle}>
                                    <Ionicons name={action.icon as any} size={30} color={Colors.yss.white} />
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                </ScrollView>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.yss.cream,
    },
    content: {
        padding: 20,
        paddingBottom: 100, // Space for bottom bar
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 24,
        color: Colors.yss.orange,
        fontFamily: 'serif',
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.yss.text,
        fontFamily: 'serif',
    },
    profileButton: {
        padding: 5,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255, 0.6)',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statLabel: {
        color: Colors.yss.text,
        opacity: 0.8,
        fontSize: 13,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.yss.text,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.yss.text,
        marginBottom: 15,
        fontFamily: 'serif',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
    },
    actionCard: {
        width: '47.5%', // Use percentage for responsiveness
        aspectRatio: 1.1,
        backgroundColor: 'rgba(255,255,255, 0.5)',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    iconCircle: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: Colors.yss.orange,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: Colors.yss.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    dropdownContainer: {
        position: 'absolute',
        top: 70,
        right: 20,
        zIndex: 1000,
    },
    dropdown: {
        backgroundColor: Colors.yss.white,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        minWidth: 200,
    },
    dropdownHeader: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownEmail: {
        fontSize: 13,
        color: '#666',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        gap: 10,
    },
    dropdownItemText: {
        fontSize: 15,
        color: Colors.yss.text,
        fontWeight: '500',
    },
});
