import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../lib/auth';

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();

    // Mock Data
    const stats = [
        { label: 'Books in Stock', value: '1,240', icon: 'book' },
        { label: 'Today Sales', value: '12', icon: 'basket' }, // "Revenue" removed, using count. Icon changed to basket/cart.
    ];

    const actions = [
        { label: 'New Sale', icon: 'add-circle', route: '/(auth)/sales' }, // Explicit Sales button pointing to + action
        { label: 'Inventory', icon: 'list', route: '/(auth)/inventory' },
        { label: 'Reports', icon: 'bar-chart', route: '/(auth)/reports' },
        { label: 'Users', icon: 'people', route: '/(auth)/admin/users' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header - Kept as is per request, just text change */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Jaiguru,</Text>
                    <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}.</Text>
                </View>
                <TouchableOpacity style={styles.profileButton}>
                    <Ionicons name="person-circle-outline" size={40} color={Colors.yss.orange} />
                </TouchableOpacity>
            </View>

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
});
