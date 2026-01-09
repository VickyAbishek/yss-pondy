import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../lib/language';

export function BottomNavigation() {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();

    // Hide FAB on sales page to avoid distraction during checkout
    const isSalesPage = pathname.startsWith('/sales');

    const isInventory = pathname.startsWith('/inventory');
    const fabAction = isInventory ? '/inventory/add' : '/sales';
    const fabLabel = isInventory ? t('addBook') : t('newSale');

    const isActive = (route: string) => pathname === route;

    return (
        <View style={styles.container}>
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push('/(auth)/dashboard')}
                >
                    <Ionicons
                        name={isActive('/(auth)/dashboard') ? "home" : "home-outline"}
                        size={24}
                        color={isActive('/(auth)/dashboard') ? Colors.yss.orange : Colors.yss.text}
                    />
                    <Text style={[
                        styles.navText,
                        { color: isActive('/(auth)/dashboard') ? Colors.yss.orange : Colors.yss.text }
                    ]}>
                        {t('dashboard')}
                    </Text>
                </TouchableOpacity>

                {/* Spacer for FAB */}
                <View style={{ width: 60 }} />

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.push('/(auth)/inventory')}
                >
                    <Ionicons
                        name={isActive('/(auth)/inventory') ? "list" : "list-outline"}
                        size={24}
                        color={isActive('/(auth)/inventory') ? Colors.yss.orange : Colors.yss.text}
                    />
                    <Text style={[
                        styles.navText,
                        { color: isActive('/(auth)/inventory') ? Colors.yss.orange : Colors.yss.text }
                    ]}>
                        {t('inventory')}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Floating Action Button (FAB) - Hidden on sales page */}
            {!isSalesPage && (
                <TouchableOpacity
                    style={styles.fabContainer}
                    onPress={() => router.push(fabAction as any)}
                    activeOpacity={0.8}
                >
                    <View style={styles.fab}>
                        <Ionicons name="add" size={40} color={Colors.yss.white} />
                    </View>
                    <View style={styles.labelContainer}>
                        <Text style={styles.fabLabel}>{fabLabel}</Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    bottomBar: {
        flexDirection: 'row',
        backgroundColor: Colors.yss.white,
        width: '100%',
        height: 70,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minWidth: 50,
    },
    navText: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: '500',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 20, // Move up slightly so label fits
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    fab: {
        backgroundColor: Colors.yss.orange,
        width: 65,
        height: 65,
        borderRadius: 32.5,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.yss.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 4,
        borderColor: Colors.yss.cream,
        marginBottom: 4,
    },
    labelContainer: {
        backgroundColor: Colors.yss.cream, // Background to ensure legibility over page content if needed
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    fabLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.yss.orange,
        textAlign: 'center',
    }
});
