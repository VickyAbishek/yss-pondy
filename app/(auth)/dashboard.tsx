import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../lib/auth';
// Icons would normally come from @expo/vector-icons, assuming installed (standard in expo)
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
    const { user } = useAuth();
    const router = useRouter();

    // Mock Data
    const stats = [
        { label: 'Total Sales', value: '₹15,420', icon: 'trending-up' },
        { label: 'Books in Stock', value: '4,500', icon: 'book' },
    ];

    const actions = [
        { label: 'New Sale', icon: 'cart', route: '/(auth)/sales' },
        { label: 'Inventory', icon: 'list', route: '/(auth)/inventory' },
        { label: 'Reports', icon: 'bar-chart', route: '/(auth)/reports' },
        { label: 'Users', icon: 'people', route: '/(auth)/admin/users' }, // Admin only?
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Namaste,</Text>
                        <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}.</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton}>
                        <Ionicons name="person-circle-outline" size={40} color={Colors.yss.orange} />
                    </TouchableOpacity>
                </View>

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
                <Text style={styles.sectionTitle}>Actions</Text>
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
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
        backgroundColor: 'rgba(255,255,255, 0.6)', // Glassmorphismish
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    statHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    statLabel: {
        color: Colors.yss.text,
        opacity: 0.7,
        fontSize: 12,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 24,
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
        gap: 15,
    },
    actionCard: {
        width: '47%', // roughly half minus gap
        aspectRatio: 1,
        backgroundColor: 'rgba(255,255,255, 0.4)',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.yss.orange, // Primary button color
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: Colors.yss.orange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    actionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.yss.text,
    }
});
