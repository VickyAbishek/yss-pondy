import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../constants/Colors';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';

interface UserProfile {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function UsersScreen() {
    const router = useRouter();
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        } else {
            setLoading(false);
        }
    }, [isAdmin]);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const approveUser = async (userId: string) => {
        setApproving(userId);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'user' })
                .eq('id', userId);

            if (error) throw error;

            // Remove from list after approval
            setUsers(prev => prev.filter(u => u.id !== userId));
            alert('User approved successfully!');
        } catch (error: any) {
            console.error('Error approving user:', error);
            alert('Failed to approve user: ' + error.message);
        } finally {
            setApproving(null);
        }
    };

    // Non-admin view
    if (!isAdmin) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Users</Text>
                    <View style={{ width: 34 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed-outline" size={80} color={Colors.yss.orange} />
                    </View>
                    <Text style={styles.title}>Access Denied</Text>
                    <Text style={styles.subtitle}>
                        You don't have permission to access this page.{'\n'}
                        Only administrators can manage users.
                    </Text>

                    <TouchableOpacity style={styles.backHomeButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                        <Text style={styles.backHomeText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Admin view
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.yss.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pending Users</Text>
                <TouchableOpacity onPress={fetchUsers} style={styles.backButton}>
                    <Ionicons name="refresh" size={24} color={Colors.yss.orange} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.yss.orange} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
                            <Text style={styles.emptyTitle}>All caught up!</Text>
                            <Text style={styles.emptySubtitle}>No pending user approvals</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.userCard}>
                            <View style={styles.userInfo}>
                                <View style={styles.avatarCircle}>
                                    <Ionicons name="person" size={24} color={Colors.yss.orange} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.userEmail}>{item.email}</Text>
                                    <Text style={styles.userDate}>
                                        Requested: {new Date(item.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.approveButton,
                                    approving === item.id && styles.approvingButton
                                ]}
                                onPress={() => approveUser(item.id)}
                                disabled={approving === item.id}
                            >
                                {approving === item.id ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={20} color="white" />
                                        <Text style={styles.approveText}>Approve</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
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
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.yss.text,
        marginTop: 20,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    userCard: {
        backgroundColor: Colors.yss.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(232, 93, 4, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userEmail: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    },
    userDate: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
    },
    approveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        gap: 8,
    },
    approvingButton: {
        opacity: 0.7,
    },
    approveText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});
