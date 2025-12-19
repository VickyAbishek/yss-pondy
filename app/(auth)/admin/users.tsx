import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';

export default function UsersScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Users</Text>
                <View style={{ width: 34 }} />
            </View>

            {/* Coming Soon Content */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="construct-outline" size={80} color={Colors.yss.orange} />
                </View>
                <Text style={styles.title}>Coming Soon</Text>
                <Text style={styles.subtitle}>
                    User management features are being built.{'\n'}
                    Stay tuned for updates!
                </Text>

                <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.yss.orange} />
                        <Text style={styles.featureText}>Manage user accounts</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.yss.orange} />
                        <Text style={styles.featureText}>Role-based permissions</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={Colors.yss.orange} />
                        <Text style={styles.featureText}>User activity logs</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                    <Text style={styles.backHomeText}>Go Back</Text>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(232, 93, 4, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.yss.text,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    featureList: {
        alignSelf: 'stretch',
        backgroundColor: Colors.yss.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 15,
    },
    featureText: {
        fontSize: 15,
        color: Colors.yss.text,
    },
    backHomeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.yss.orange,
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    backHomeText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
